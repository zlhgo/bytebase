<template>
  <div class="max-w-3xl w-full mx-auto">
    <FeatureAttention
      v-if="!hasRBACFeature"
      custom-class="my-5"
      feature="bb.feature.rbac"
      :description="$t('subscription.features.bb-feature-rbac.desc')"
    />

    <div class="mb-4 w-full flex flex-row justify-between items-center">
      <div>
        <SearchBox
          v-model:value="state.searchText"
          style="width: 12rem"
          :placeholder="'Search member'"
        />
      </div>
      <div v-if="allowAdmin" class="flex gap-x-2">
        <NButton
          type=""
          :disabled="state.selectedMemberNameList.size === 0"
          @click="handleRevokeSelectedMembers"
        >
          {{ $t("project.members.revoke-member") }}
        </NButton>
        <NButton type="primary" @click="state.showAddMemberPanel = true">
          <template #icon>
            <heroicons-outline:user-add class="w-4 h-4" />
          </template>
          {{ $t("project.members.add-member") }}
        </NButton>
      </div>
    </div>

    <ProjectMemberTable
      :iam-policy="iamPolicy"
      :project="project"
      :ready="ready"
      :editable="true"
      :member-list="renderedComposedMemberList"
      :show-selection-column="allowAdmin"
    >
      <template #selection-all="{ memberList }">
        <input
          v-if="renderedComposedMemberList.length > 0"
          type="checkbox"
          class="h-4 w-4 text-accent rounded disabled:cursor-not-allowed border-control-border focus:ring-accent"
          v-bind="getAllSelectionState(memberList)"
          @input="
            toggleAllMembersSelection(
              memberList,
              ($event.target as HTMLInputElement).checked
            )
          "
        />
      </template>
      <template #selection="{ member }">
        <input
          type="checkbox"
          class="h-4 w-4 text-accent rounded disabled:cursor-not-allowed border-control-border focus:ring-accent"
          :checked="isMemeberSelected(member)"
          @input="(e: any) => toggleMemberSelection(member, e.target.checked)"
        />
      </template>
    </ProjectMemberTable>

    <div v-if="inactiveComposedMemberList.length > 0" class="mt-4 ml-2">
      <NCheckbox v-model:checked="state.showInactiveMemberList">
        <span class="textinfolabel">
          {{ $t("project.members.show-inactive") }}
        </span>
      </NCheckbox>
    </div>

    <div v-if="state.showInactiveMemberList" class="my-4 space-y-2">
      <div class="text-lg font-medium leading-7 text-main">
        <span>{{ $t("project.members.inactive-members") }}</span>
        <span class="ml-1 font-normal text-control-light">
          ({{ inactiveComposedMemberList.length }})
        </span>
      </div>
      <ProjectMemberTable
        :iam-policy="iamPolicy"
        :project="project"
        :ready="ready"
        :editable="false"
        :member-list="inactiveComposedMemberList"
      />
    </div>
  </div>

  <AddProjectMembersPanel
    v-if="state.showAddMemberPanel"
    :project="project"
    @close="state.showAddMemberPanel = false"
  />
</template>

<script lang="ts" setup>
import { computed, reactive } from "vue";
import { NButton, NCheckbox, useDialog } from "naive-ui";
import { useI18n } from "vue-i18n";
import { cloneDeep, orderBy, uniq } from "lodash-es";

import ProjectMemberTable, {
  ComposedProjectMember,
} from "./ProjectMemberTable";
import {
  ComposedProject,
  DEFAULT_PROJECT_V1_NAME,
  PresetRoleType,
  unknownUser,
} from "@/types";
import {
  extractUserUID,
  hasPermissionInProjectV1,
  hasWorkspacePermissionV1,
} from "@/utils";
import {
  extractUserEmail,
  featureToRef,
  pushNotification,
  useCurrentUserV1,
  useProjectIamPolicy,
  useProjectIamPolicyStore,
  useUserStore,
} from "@/store";
import { State } from "@/types/proto/v1/common";
import AddProjectMembersPanel from "./AddProjectMember/AddProjectMembersPanel.vue";

interface LocalState {
  searchText: string;
  selectedMemberNameList: Set<string>;
  showInactiveMemberList: boolean;
  showAddMemberPanel: boolean;
}

const props = defineProps<{
  project: ComposedProject;
}>();

const { t } = useI18n();
const dialog = useDialog();
const currentUserV1 = useCurrentUserV1();
const projectResourceName = computed(() => props.project.name);
const { policy: iamPolicy, ready } = useProjectIamPolicy(projectResourceName);

const state = reactive<LocalState>({
  searchText: "",
  selectedMemberNameList: new Set(),
  showInactiveMemberList: false,
  showAddMemberPanel: false,
});

const hasRBACFeature = featureToRef("bb.feature.rbac");
const userStore = useUserStore();

const allowAdmin = computed(() => {
  if (props.project.name === DEFAULT_PROJECT_V1_NAME) {
    return false;
  }

  if (props.project.state === State.DELETED) {
    return false;
  }

  // Allow workspace roles having manage project permission here in case project owners are not available.
  if (
    hasWorkspacePermissionV1(
      "bb.permission.workspace.manage-project",
      currentUserV1.value.userRole
    )
  ) {
    return true;
  }

  if (
    hasPermissionInProjectV1(
      iamPolicy.value,
      currentUserV1.value,
      "bb.permission.project.manage-member"
    )
  ) {
    return true;
  }
  return false;
});

const composedMemberList = computed(() => {
  const distinctUserResourceNameList = uniq(
    iamPolicy.value.bindings.flatMap((binding) => binding.members)
  );

  const userList = distinctUserResourceNameList.map((user) => {
    const email = extractUserEmail(user);
    return (
      userStore.getUserByEmail(email) ?? {
        ...unknownUser(),
        email,
      }
    );
  });

  const usersByRole = iamPolicy.value.bindings.map((binding) => {
    return {
      role: binding.role,
      users: new Set(binding.members.map(extractUserEmail)),
    };
  });
  const userRolesList = userList.map<ComposedProjectMember>((user) => {
    const roleList = uniq(
      usersByRole
        .filter((binding) => binding.users.has(user.email))
        .map((binding) => binding.role)
    );
    return {
      user,
      roleList,
    };
  });

  return orderBy(
    userRolesList,
    [
      (item) => (item.roleList.includes(PresetRoleType.OWNER) ? 0 : 1),
      (item) => parseInt(extractUserUID(item.user.name), 10),
    ],
    ["asc", "asc"]
  );
});

const activeComposedMemberList = computed(() => {
  return composedMemberList.value.filter(
    (item) => item.user.state === State.ACTIVE
  );
});

const renderedComposedMemberList = computed(() => {
  const { searchText } = state;
  if (searchText === "") {
    return activeComposedMemberList.value;
  }
  return activeComposedMemberList.value.filter(
    (item) =>
      item.user.title.toLowerCase().includes(searchText.toLowerCase()) ||
      item.user.email.toLowerCase().includes(searchText.toLowerCase())
  );
});

const inactiveComposedMemberList = computed(() => {
  return composedMemberList.value.filter(
    (item) => item.user.state === State.DELETED
  );
});

const isMemeberSelected = (member: ComposedProjectMember) => {
  return state.selectedMemberNameList.has(member.user.name);
};

const getAllSelectionState = (
  memberList: ComposedProjectMember[]
): { checked: boolean; indeterminate: boolean } => {
  const checked = memberList.every((member) => isMemeberSelected(member));
  const indeterminate =
    !checked && memberList.some((member) => isMemeberSelected(member));

  return {
    checked,
    indeterminate,
  };
};

const toggleMemberSelection = (member: ComposedProjectMember, on: boolean) => {
  if (on) {
    state.selectedMemberNameList.add(member.user.name);
  } else {
    state.selectedMemberNameList.delete(member.user.name);
  }
};

const toggleAllMembersSelection = (
  memberList: ComposedProjectMember[],
  on: boolean
): void => {
  const set = state.selectedMemberNameList;
  if (on) {
    memberList.forEach((member) => {
      set.add(member.user.name);
    });
  } else {
    memberList.forEach((member) => {
      set.delete(member.user.name);
    });
  }
};

const handleRevokeSelectedMembers = () => {
  const selectedMembers = Array.from(state.selectedMemberNameList.values())
    .map((name) => {
      return composedMemberList.value.find(
        (member) => member.user.name === name
      );
    })
    .filter((member) => member !== undefined) as ComposedProjectMember[];
  if (selectedMembers.length === 0) {
    return;
  }
  if (
    selectedMembers
      .map((member) => member.user.name)
      .includes(currentUserV1.value.name)
  ) {
    pushNotification({
      module: "bytebase",
      style: "WARN",
      title: "You cannot revoke yourself",
    });
    return;
  }

  dialog.warning({
    title: "Revoke these members",
    negativeText: t("common.cancel"),
    positiveText: t("common.confirm"),
    onPositiveClick: async () => {
      const userIAMNameList = selectedMembers.map((member) => {
        return `user:${member!.user.email}`;
      });
      const policy = cloneDeep(iamPolicy.value);

      for (const binding of policy.bindings) {
        binding.members = binding.members.filter(
          (member) => !userIAMNameList.includes(member)
        );
      }
      policy.bindings = policy.bindings.filter(
        (binding) => binding.members.length > 0
      );
      await useProjectIamPolicyStore().updateProjectIamPolicy(
        projectResourceName.value,
        policy
      );

      pushNotification({
        module: "bytebase",
        style: "SUCCESS",
        title: "Revoke succeed",
      });
      state.selectedMemberNameList.clear();
    },
  });
};
</script>
