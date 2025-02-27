<template>
  <div>
    <div
      v-for="section in backupSectionList"
      :key="section.title"
      class="border-x border-b first:border-t"
    >
      <div class="py-2 px-2">{{ section.title }}</div>

      <BBGrid
        :column-list="columnList"
        :data-source="section.list"
        class="border-t"
        :row-clickable="false"
        :show-placeholder="true"
      >
        <template #item="{ item: backup }: BackupRow">
          <div class="bb-grid-cell">
            <span
              class="flex items-center justify-center rounded-full select-none"
              :class="statusIconClass(backup)"
            >
              <template
                v-if="backup.state === Backup_BackupState.PENDING_CREATE"
              >
                <span
                  class="h-2 w-2 bg-info hover:bg-info-hover rounded-full"
                  style="
                    animation: pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                  "
                >
                </span>
              </template>
              <template v-else-if="backup.state === Backup_BackupState.DONE">
                <heroicons-outline:check class="w-4 h-4" />
              </template>
              <template v-else-if="backup.state === Backup_BackupState.FAILED">
                <span
                  class="h-2 w-2 rounded-full text-center pb-6 font-normal text-base"
                  aria-hidden="true"
                  >!</span
                >
              </template>
            </span>
          </div>
          <div class="bb-grid-cell">
            {{ extractBackupResourceName(backup.name) }}
          </div>
          <div class="bb-grid-cell">
            <EllipsisText>
              {{ backup.comment }}
            </EllipsisText>
          </div>
          <div class="bb-grid-cell">
            <HumanizeDate :date="backup.createTime" />
          </div>
          <div v-if="allowEdit" class="bb-grid-cell">
            <NButton
              :disabled="!allowRestore(backup)"
              @click.stop="showRestoreDialog(backup)"
            >
              {{ $t("database.restore") }}
            </NButton>
          </div>
        </template>
      </BBGrid>
    </div>

    <Drawer
      :show="state.restoreBackupContext !== undefined"
      @close="state.restoreBackupContext = undefined"
    >
      <DrawerContent
        v-if="state.restoreBackupContext"
        :title="$t('database.restore-database')"
      >
        <div class="w-72">
          <div v-if="allowRestoreInPlace" class="space-y-4">
            <RestoreTargetForm
              :target="state.restoreBackupContext.target"
              first="NEW"
              @change="state.restoreBackupContext!.target = $event"
            />
          </div>

          <div class="mt-2">
            <CreateDatabasePrepForm
              v-if="state.restoreBackupContext.target === 'NEW'"
              ref="createDatabasePrepForm"
              :project-id="database.projectEntity.uid"
              :environment-id="database.instanceEntity.environmentEntity.uid"
              :instance-id="database.instanceEntity.uid"
              :backup="state.restoreBackupContext.backup"
              @dismiss="state.restoreBackupContext = undefined"
            />
          </div>
          <div
            v-if="state.creatingRestoreIssue"
            class="absolute inset-0 z-10 bg-white/70 flex items-center justify-center"
          >
            <BBSpin />
          </div>
        </div>

        <template #footer>
          <div v-if="state.restoreBackupContext.target === 'NEW'">
            <CreateDatabasePrepButtonGroup :form="createDatabasePrepForm" />
          </div>

          <div
            v-if="state.restoreBackupContext.target === 'IN-PLACE'"
            class="w-full flex justify-end gap-x-3"
          >
            <NButton @click="state.restoreBackupContext = undefined">
              {{ $t("common.cancel") }}
            </NButton>

            <NButton type="primary" @click="doRestoreInPlace">
              {{ $t("common.confirm") }}
            </NButton>
          </div>
        </template>
      </DrawerContent>
    </Drawer>
    <BBModal
      v-if="false && state.restoreBackupContext"
      :title="$t('database.restore-database')"
      @close="state.restoreBackupContext = undefined"
    >
    </BBModal>

    <FeatureModal
      v-if="state.showFeatureModal"
      feature="bb.feature.pitr"
      @cancel="state.showFeatureModal = false"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, PropType, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { NButton } from "naive-ui";

import { BBGrid, BBGridColumn, BBGridRow } from "@/bbkit";
import {
  ComposedDatabase,
  IssueCreate,
  PITRContext,
  SYSTEM_BOT_ID,
} from "@/types";
import { issueSlug, extractBackupResourceName } from "@/utils";
import { featureToRef, useIssueStore } from "@/store";
import { Drawer, DrawerContent } from "@/components/v2";
import {
  CreateDatabasePrepForm,
  CreateDatabasePrepButtonGroup,
} from "@/components/CreateDatabasePrepForm";
import HumanizeDate from "@/components/misc/HumanizeDate.vue";
import EllipsisText from "@/components/EllipsisText.vue";
import {
  default as RestoreTargetForm,
  RestoreTarget,
} from "@/components/DatabaseBackup/RestoreTargetForm.vue";
import { Engine } from "@/types/proto/v1/common";
import {
  Backup,
  Backup_BackupState,
  Backup_BackupType,
} from "@/types/proto/v1/database_service";

export type BackupRow = BBGridRow<Backup>;

type RestoreBackupContext = {
  target: RestoreTarget;
  backup: Backup;
};

type Section = {
  title: string;
  list: Backup[];
};

interface LocalState {
  restoreBackupContext?: RestoreBackupContext;
  loadingMigrationHistory: boolean;
  creatingRestoreIssue: boolean;
  showFeatureModal: boolean;
}

const props = defineProps({
  database: {
    required: true,
    type: Object as PropType<ComposedDatabase>,
  },
  backupList: {
    required: true,
    type: Object as PropType<Backup[]>,
  },
  allowEdit: {
    required: true,
    type: Boolean,
  },
});

const router = useRouter();
const { t } = useI18n();

const state = reactive<LocalState>({
  restoreBackupContext: undefined,
  loadingMigrationHistory: false,
  creatingRestoreIssue: false,
  showFeatureModal: false,
});

const allowRestoreInPlace = computed((): boolean => {
  return props.database.instanceEntity.engine === Engine.POSTGRES;
});

const hasPITRFeature = featureToRef("bb.feature.pitr");
const createDatabasePrepForm =
  ref<InstanceType<typeof CreateDatabasePrepForm>>();

const columnList = computed(() => {
  const columns: BBGridColumn[] = [
    {
      title: t("common.status"),
      width: "auto",
    },
    {
      title: t("common.name"),
      width: "1fr",
    },
    {
      title: t("common.comment"),
      width: "2fr",
    },
    {
      title: t("common.time"),
      width: "auto",
    },
  ];
  if (props.allowEdit) {
    columns.push({
      title: "",
      width: "auto",
    });
  }
  return columns;
});

const backupSectionList = computed(() => {
  const manualList: Backup[] = [];
  const automaticList: Backup[] = [];
  const pitrList: Backup[] = [];
  const sectionList: Section[] = [
    {
      title: t("common.manual"),
      list: manualList,
    },
    {
      title: t("common.automatic"),
      list: automaticList,
    },
    {
      title: t("common.pitr"),
      list: pitrList,
    },
  ];

  for (const backup of props.backupList) {
    if (backup.backupType === Backup_BackupType.MANUAL) {
      manualList.push(backup);
    } else if (backup.backupType === Backup_BackupType.AUTOMATIC) {
      automaticList.push(backup);
    } else if (backup.backupType === Backup_BackupType.PITR) {
      pitrList.push(backup);
    }
  }

  return sectionList;
});

const statusIconClass = (backup: Backup) => {
  const iconClass = "w-5 h-5";
  switch (backup.state) {
    case Backup_BackupState.PENDING_CREATE:
      return (
        iconClass +
        " bg-white border-2 border-info text-info hover:text-info-hover hover:border-info-hover"
      );
    case Backup_BackupState.DONE:
      return iconClass + " bg-success hover:bg-success-hover text-white";
    case Backup_BackupState.FAILED:
      return (
        iconClass + " bg-error text-white hover:text-white hover:bg-error-hover"
      );
  }
};

const allowRestore = (backup: Backup) => {
  return backup.state === Backup_BackupState.DONE;
};

const showRestoreDialog = (backup: Backup) => {
  state.restoreBackupContext = {
    target: "NEW",
    backup,
  };
};

const doRestoreInPlace = async () => {
  const { restoreBackupContext } = state;
  if (!restoreBackupContext) {
    return;
  }

  if (!hasPITRFeature.value) {
    state.showFeatureModal = true;
    return;
  }

  state.creatingRestoreIssue = true;

  try {
    const { backup } = restoreBackupContext;
    const { database } = props;
    const issueNameParts: string[] = [
      `Restore database [${database.name}]`,
      `to backup snapshot [${restoreBackupContext.backup.name}]`,
    ];

    const issueStore = useIssueStore();
    const createContext: PITRContext = {
      databaseId: Number(database.uid),
      backupId: Number(backup.uid),
    };
    const issueCreate: IssueCreate = {
      name: issueNameParts.join(" "),
      type: "bb.issue.database.restore.pitr",
      description: "",
      assigneeId: SYSTEM_BOT_ID,
      projectId: Number(database.projectEntity.uid),
      payload: {},
      createContext,
    };

    await issueStore.validateIssue(issueCreate);

    const issue = await issueStore.createIssue(issueCreate);

    const slug = issueSlug(issue.name, issue.id);
    router.push(`/issue/${slug}`);
  } catch {
    state.creatingRestoreIssue = false;
  }
};
</script>
