<template>
  <div
    v-if="connectionTreeStore.tree.state === ConnectionTreeState.LOADED"
    class="databases-tree p-2 space-y-2 h-full flex flex-col"
    :class="connectionTreeStore.tree.mode"
  >
    <div class="databases-tree--input">
      <NInput
        :value="searchPattern"
        :placeholder="$t('sql-editor.search-databases')"
        :clearable="true"
        @update:value="$emit('update:search-pattern', $event)"
      >
        <template #prefix>
          <heroicons-outline:search class="h-5 w-5 text-gray-300" />
        </template>
      </NInput>
    </div>
    <div class="databases-tree--tree flex-1 overflow-y-auto select-none">
      <NTree
        block-line
        :data="treeData"
        :pattern="mounted ? searchPattern : ''"
        :show-irrelevant-nodes="false"
        :expand-on-click="true"
        :selected-keys="selectedKeys"
        :expanded-keys="connectionTreeStore.expandedTreeNodeKeys"
        :render-label="renderLabel"
        :render-prefix="renderPrefix"
        :render-suffix="renderSuffix"
        :node-props="nodeProps"
        @update:expanded-keys="updateExpandedKeys"
      />
    </div>

    <NDropdown
      placement="bottom-start"
      trigger="manual"
      :x="dropdownPosition.x"
      :y="dropdownPosition.y"
      :options="dropdownOptions"
      :show="showDropdown"
      :on-clickoutside="handleClickoutside"
      @select="handleSelect"
    />
  </div>
  <div v-else class="flex justify-center items-center h-full">
    <BBSpin :title="$t('sql-editor.loading-databases')" />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, h, nextTick, watch } from "vue";
import { NTree, NInput, NDropdown, DropdownOption, TreeOption } from "naive-ui";
import { useI18n } from "vue-i18n";
import { useMounted } from "@vueuse/core";

import type {
  ConnectionAtom,
  CoreTabInfo,
  DatabaseId,
  InstanceId,
} from "@/types";
import { ConnectionTreeState, TabMode, UNKNOWN_ID } from "@/types";
import {
  isConnectableAtom,
  useConnectionTreeStore,
  useCurrentUserV1,
  useDatabaseV1Store,
  useIsLoggedIn,
  useTabStore,
} from "@/store";
import {
  emptyConnection,
  getDefaultTabNameFromConnection,
  hasWorkspacePermissionV1,
  instanceV1HasReadonlyMode,
  instanceOfConnectionAtom,
  instanceV1HasAlterSchema,
  isDescendantOf,
  isSimilarTab,
} from "@/utils";
import { scrollIntoViewIfNeeded } from "@/bbkit/BBUtil";
import { Prefix, Label, Suffix } from "./TreeNode";

type Position = {
  x: number;
  y: number;
};

type DropdownOptionWithConnectionAtom = DropdownOption & {
  item: ConnectionAtom;
};

const props = defineProps<{
  searchPattern?: string;
}>();

const emit = defineEmits<{
  (
    event: "alter-schema",
    params: { databaseId: DatabaseId; schema: string; table: string }
  ): void;
  (event: "update:search-pattern", keyword: string): void;
}>();

const { t } = useI18n();

const databaseStore = useDatabaseV1Store();
const connectionTreeStore = useConnectionTreeStore();
const tabStore = useTabStore();
const isLoggedIn = useIsLoggedIn();
const currentUserV1 = useCurrentUserV1();

const mounted = useMounted();
const showDropdown = ref(false);
const dropdownPosition = ref<Position>({
  x: 0,
  y: 0,
});
const dropdownContext = ref<ConnectionAtom>();
const dropdownOptions = computed((): DropdownOptionWithConnectionAtom[] => {
  const atom = dropdownContext.value;
  if (!atom) {
    return [];
  }
  if (atom.type === "project") {
    return [];
  } else {
    // Don't show any context menu actions for disabled
    // instances/databases
    if (atom.disabled) {
      return [];
    }

    const items: DropdownOptionWithConnectionAtom[] = [];
    if (isConnectableAtom(atom)) {
      const instance = instanceOfConnectionAtom(atom);
      if (instance && instanceV1HasReadonlyMode(instance)) {
        items.push({
          key: "connect",
          label: t("sql-editor.connect"),
          item: atom,
        });
      }
      if (allowAdmin.value) {
        items.push({
          key: "connect-in-admin-mode",
          label: t("sql-editor.connect-in-admin-mode"),
          item: atom,
        });
      }
    }
    if (atom.type === "database") {
      const database = databaseStore.getDatabaseByUID(atom.id);
      if (instanceV1HasAlterSchema(database.instanceEntity)) {
        items.push({
          key: "alter-schema",
          label: t("database.alter-schema"),
          item: atom,
        });
      }
    }
    return items;
  }
});

// Highlight the current tab's connection node.
const selectedKeys = computed(() => {
  const { instanceId, databaseId } = tabStore.currentTab.connection;
  if (databaseId !== String(UNKNOWN_ID)) {
    return [`database-${databaseId}`];
  }
  if (instanceId !== String(UNKNOWN_ID)) {
    return [`instance-${instanceId}`];
  }
  return [];
});

const allowAdmin = computed(() =>
  hasWorkspacePermissionV1(
    "bb.permission.workspace.admin-sql-editor",
    currentUserV1.value.userRole
  )
);

const treeData = computed(() => connectionTreeStore.tree.data);

const setConnection = (
  option: ConnectionAtom,
  extra: { sheetName?: string; mode: TabMode } = {
    sheetName: undefined,
    mode: TabMode.ReadOnly,
  }
) => {
  if (option) {
    if (option.type === "project") {
      // Not connectable to a project
      return;
    }

    const target: CoreTabInfo = {
      connection: emptyConnection(),
      ...extra,
    };
    const conn = target.connection;

    const connect = () => {
      if (isSimilarTab(target, tabStore.currentTab)) {
        // Don't go further if the connection doesn't change.
        return;
      }
      const name = getDefaultTabNameFromConnection(target.connection);
      tabStore.selectOrAddSimilarTab(
        target,
        /* beside */ false,
        /* defaultTabName */ name
      );
      tabStore.updateCurrentTab(target);
    };

    // If selected item is instance node
    if (option.type === "instance") {
      conn.instanceId = option.id;
    } else if (option.type === "database") {
      // If selected item is database node
      const database = databaseStore.getDatabaseByUID(option.id);
      conn.instanceId = database.instanceEntity.uid;
      conn.databaseId = database.uid;
    }

    connect();
  }
};

// dynamic render the highlight keywords
const renderLabel = ({ option }: { option: TreeOption }) => {
  const atom = option as any as ConnectionAtom;
  return h(Label, { atom, keyword: props.searchPattern ?? "" });
};

// Render icons before nodes.
const renderPrefix = ({ option }: { option: TreeOption }) => {
  const atom = option as any as ConnectionAtom;
  return h(Prefix, { atom });
};

// Render a 'connected' icon in the right of the node
// if it matches the current tab's connection
const renderSuffix = ({ option }: { option: TreeOption }) => {
  const atom = option as any as ConnectionAtom;
  return h(Suffix, { atom });
};

const handleSelect = (key: string) => {
  const option = dropdownOptions.value.find((item) => item.key === key);
  if (!option) {
    return;
  }

  if (key === "alter-schema") {
    emit("alter-schema", {
      databaseId: option.item.id,
      schema: "",
      table: "",
    });
  } else if (key === "connect") {
    setConnection(option.item);
  } else if (key === "connect-in-admin-mode") {
    setConnection(option.item, { mode: TabMode.Admin });
  }

  showDropdown.value = false;
};

const handleClickoutside = () => {
  showDropdown.value = false;
};

const maybeExpandKey = (key: string) => {
  const keys = connectionTreeStore.expandedTreeNodeKeys;
  if (!keys.includes(key)) {
    keys.push(key);
  }
};

const nodeProps = ({ option }: { option: TreeOption }) => {
  const atom = option as any as ConnectionAtom;
  return {
    onClick(e: MouseEvent) {
      if (atom.disabled) return;

      if (isDescendantOf(e.target as Element, ".n-tree-node-content")) {
        // Check if clicked on the content part.
        // And ignore the fold/unfold arrow.
        if (atom.type === "instance" || atom.type === "database") {
          setConnection(atom);
        }
      }
    },
    onContextmenu(e: MouseEvent) {
      e.preventDefault();
      showDropdown.value = false;
      if (atom && atom.key) {
        dropdownContext.value = atom;
      }

      nextTick().then(() => {
        showDropdown.value = true;
        dropdownPosition.value.x = e.clientX;
        dropdownPosition.value.y = e.clientY;
      });
    },
    "data-node-type": atom.type,
  };
};

const updateExpandedKeys = (keys: string[]) => {
  connectionTreeStore.expandedTreeNodeKeys = keys.filter(
    (key) => !key.startsWith("database-")
  );
};

// When switching tabs, scroll the matched node into view if needed.
const scrollToConnectedNode = (
  instanceId: InstanceId,
  databaseId: DatabaseId
) => {
  if (instanceId === UNKNOWN_ID && databaseId === UNKNOWN_ID) {
    return;
  }
  let id: string;
  if (databaseId === UNKNOWN_ID) {
    id = `tree-node-label-instance-${instanceId}`;
  } else {
    id = `tree-node-label-database-${databaseId}`;
  }
  nextTick(() => {
    const elem = document.getElementById(id);
    if (elem) {
      scrollIntoViewIfNeeded(elem);
    }
  });
};

// Open corresponding tree node when the connection changed.
watch(
  [
    isLoggedIn,
    () => tabStore.currentTab.connection.instanceId,
    () => tabStore.currentTab.connection.databaseId,
    () => connectionTreeStore.tree.state,
  ],
  ([isLoggedIn, instanceId, databaseId, treeState]) => {
    if (!isLoggedIn) {
      // Don't go further and cleanup the state if we signed out.
      connectionTreeStore.expandedTreeNodeKeys = [];
      return;
    }
    if (treeState !== ConnectionTreeState.LOADED) {
      return;
    }

    if (instanceId !== String(UNKNOWN_ID)) {
      maybeExpandKey(`instance-${instanceId}`);
    }
    if (databaseId !== String(UNKNOWN_ID)) {
      const db = databaseStore.getDatabaseByUID(databaseId);
      const projectId = db.projectEntity.uid;
      maybeExpandKey(`project-${projectId}`);
    }

    scrollToConnectedNode(instanceId, databaseId);
  },
  { immediate: true }
);
</script>

<style postcss>
.databases-tree .n-tree-node-content {
  @apply !pl-0;
}
.databases-tree .n-tree-node-content__prefix {
  @apply shrink-0 !mr-1;
}
.databases-tree.project
  .n-tree-node[data-node-type="project"]
  .n-tree-node-content__prefix {
  @apply hidden;
}
.databases-tree .n-tree-node-content__text {
  @apply truncate mr-1;
}
.databases-tree .n-tree-node--pending {
  background-color: transparent !important;
}
.databases-tree .n-tree-node--pending:hover {
  background-color: var(--n-node-color-hover) !important;
}
.databases-tree .n-tree-node--selected,
.databases-tree .n-tree-node--selected:hover {
  background-color: var(--n-node-color-active) !important;
}
</style>
