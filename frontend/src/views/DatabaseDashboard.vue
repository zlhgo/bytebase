<template>
  <div class="flex flex-col relative">
    <div class="px-5 py-2 flex justify-between items-center">
      <EnvironmentTabFilter
        :include-all="true"
        :environment="selectedEnvironment?.uid ?? String(UNKNOWN_ID)"
        @update:environment="changeEnvironmentId"
      />

      <div class="flex items-center space-x-4">
        <NTooltip v-if="canVisitUnassignedDatabases">
          <template #trigger>
            <router-link
              :to="{
                name: 'workspace.project.detail',
                params: {
                  projectSlug: DEFAULT_PROJECT_ID,
                },
                hash: '#databases',
              }"
              class="normal-link text-sm"
            >
              {{ $t("database.view-unassigned-databases") }}
            </router-link>
          </template>

          <div class="whitespace-pre-wrap">
            {{ $t("quick-action.default-db-hint") }}
          </div>
        </NTooltip>

        <NInputGroup style="width: auto">
          <InstanceSelect
            :instance="state.instanceFilter"
            :include-all="true"
            :environment="selectedEnvironment?.uid"
            @update:instance="
              state.instanceFilter = $event ?? String(UNKNOWN_ID)
            "
          />
          <SearchBox
            :value="state.searchText"
            :placeholder="$t('database.search-database')"
            :autofocus="true"
            @update:value="changeSearchText($event)"
          />
        </NInputGroup>
      </div>
    </div>

    <DatabaseV1Table
      pagination-class="mb-4"
      :database-list="filteredDatabaseList"
      :database-group-list="filteredDatabaseGroupList"
      :show-placeholder="true"
    />

    <div
      v-if="state.loading"
      class="absolute inset-0 bg-white/50 flex justify-center items-center"
    >
      <BBSpin />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, watchEffect, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { NInputGroup, NTooltip } from "naive-ui";

import {
  EnvironmentTabFilter,
  InstanceSelect,
  DatabaseV1Table,
  SearchBox,
} from "@/components/v2";
import {
  UNKNOWN_ID,
  DEFAULT_PROJECT_ID,
  UNKNOWN_USER_NAME,
  ComposedDatabase,
  ComposedDatabaseGroup,
} from "../types";
import {
  filterDatabaseV1ByKeyword,
  hasWorkspacePermissionV1,
  sortDatabaseV1List,
  isDatabaseV1Accessible,
} from "@/utils";
import {
  useCurrentUserV1,
  useDBGroupStore,
  useDatabaseV1Store,
  useEnvironmentV1Store,
  usePolicyV1Store,
  useUIStateStore,
} from "@/store";
import {
  Policy,
  PolicyResourceType,
  PolicyType,
} from "@/types/proto/v1/org_policy_service";

interface LocalState {
  instanceFilter: string;
  searchText: string;
  databaseV1List: ComposedDatabase[];
  databaseGroupList: ComposedDatabaseGroup[];
  loading: boolean;
}

const uiStateStore = useUIStateStore();
const environmentV1Store = useEnvironmentV1Store();
const router = useRouter();
const route = useRoute();

const state = reactive<LocalState>({
  instanceFilter: String(UNKNOWN_ID),
  searchText: "",
  databaseV1List: [],
  databaseGroupList: [],
  loading: false,
});

const currentUserV1 = useCurrentUserV1();
const databaseV1Store = useDatabaseV1Store();
const dbGroupStore = useDBGroupStore();
const policyList = ref<Policy[]>([]);

const preparePolicyList = () => {
  usePolicyV1Store()
    .fetchPolicies({
      resourceType: PolicyResourceType.DATABASE,
      policyType: PolicyType.ACCESS_CONTROL,
    })
    .then((list) => (policyList.value = list));
};

watchEffect(preparePolicyList);

const selectedEnvironment = computed(() => {
  const { environment } = route.query;
  return environment
    ? environmentV1Store.getEnvironmentByUID(environment as string)
    : undefined;
});

const canVisitUnassignedDatabases = computed(() => {
  return hasWorkspacePermissionV1(
    "bb.permission.workspace.manage-database",
    currentUserV1.value.userRole
  );
});

onMounted(() => {
  if (!uiStateStore.getIntroStateByKey("database.visit")) {
    uiStateStore.saveIntroStateByKey({
      key: "database.visit",
      newState: true,
    });
  }
});

const prepareDatabaseList = async () => {
  // It will also be called when user logout
  if (currentUserV1.value.name !== UNKNOWN_USER_NAME) {
    state.loading = true;
    const databaseV1List = await databaseV1Store.searchDatabaseList({
      parent: "instances/-",
    });
    state.databaseV1List = sortDatabaseV1List(databaseV1List);
    state.loading = false;
  }
};

const prepareDatabaseGroupList = async () => {
  if (currentUserV1.value.name !== UNKNOWN_USER_NAME) {
    state.databaseGroupList = await dbGroupStore.fetchAllDatabaseGroupList();
  }
};

watchEffect(async () => {
  state.loading = true;
  await prepareDatabaseList();
  await prepareDatabaseGroupList();
  state.loading = false;
});

const changeEnvironmentId = (environment: string | undefined) => {
  if (environment && environment !== String(UNKNOWN_ID)) {
    router.replace({
      name: "workspace.database",
      query: { environment },
    });
  } else {
    router.replace({ name: "workspace.database" });
  }
};

const changeSearchText = (searchText: string) => {
  state.searchText = searchText;
};

const filteredDatabaseList = computed(() => {
  let list = [...state.databaseV1List].filter((database) =>
    isDatabaseV1Accessible(database, policyList.value, currentUserV1.value)
  );
  const environment = selectedEnvironment.value;
  if (environment && environment.name !== `environments/${UNKNOWN_ID}`) {
    list = list.filter(
      (db) => db.instanceEntity.environment === environment.name
    );
  }
  if (state.instanceFilter !== String(UNKNOWN_ID)) {
    list = list.filter(
      (db) => db.instanceEntity.uid === String(state.instanceFilter)
    );
  }
  const keyword = state.searchText.trim().toLowerCase();
  if (keyword) {
    list = list.filter((db) =>
      filterDatabaseV1ByKeyword(db, keyword, [
        "name",
        "environment",
        "instance",
        "project",
      ])
    );
  }
  return list;
});

const filteredDatabaseGroupList = computed(() => {
  let list = [...state.databaseGroupList];
  const environment = selectedEnvironment.value;
  if (environment && environment.name !== `environments/${UNKNOWN_ID}`) {
    list = list.filter(
      (dbGroup) => dbGroup.environmentName === environment.name
    );
  }
  const keyword = state.searchText.trim().toLowerCase();
  if (keyword) {
    list = list.filter(
      (dbGroup) =>
        dbGroup.name.includes(keyword) ||
        dbGroup.databasePlaceholder.includes(keyword)
    );
  }
  return list;
});
</script>
