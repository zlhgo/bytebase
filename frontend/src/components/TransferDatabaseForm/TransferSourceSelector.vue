<template>
  <div class="textlabel">
    <div v-if="state.transferSource == 'DEFAULT'" class="textinfolabel mb-2">
      {{ $t("quick-action.unassigned-db-hint") }}
    </div>
    <div class="flex items-center justify-between">
      <div class="radio-set-row">
        <template v-if="project.name !== DEFAULT_PROJECT_V1_NAME">
          <label class="radio">
            <input
              v-model="state.transferSource"
              tabindex="-1"
              type="radio"
              class="btn"
              value="DEFAULT"
            />
            <span class="label">
              {{ $t("quick-action.from-unassigned-databases") }}
            </span>
          </label>
          <label class="radio">
            <input
              v-model="state.transferSource"
              tabindex="-1"
              type="radio"
              class="btn"
              value="OTHER"
            />
            <span class="label">
              {{ $t("quick-action.from-projects") }}
            </span>
          </label>
        </template>
      </div>
      <NInputGroup style="width: auto">
        <InstanceSelect
          :instance="instanceFilter?.uid ?? String(UNKNOWN_ID)"
          :include-all="true"
          :filter="filterInstance"
          @update:instance="changeInstanceFilter"
        />
        <SearchBox
          :value="searchText"
          :placeholder="$t('database.search-database')"
          @update:value="$emit('search-text-change', $event)"
        />
      </NInputGroup>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { type PropType, computed, reactive, watch } from "vue";
import { NInputGroup } from "naive-ui";

import { TransferSource } from "./utils";
import {
  UNKNOWN_ID,
  ComposedDatabase,
  ComposedInstance,
  DEFAULT_PROJECT_V1_NAME,
} from "@/types";
import { InstanceSelect, SearchBox } from "@/components/v2";
import { useInstanceV1Store } from "@/store";
import { Project } from "@/types/proto/v1/project_service";

interface LocalState {
  transferSource: TransferSource;
}

const props = defineProps({
  project: {
    required: true,
    type: Object as PropType<Project>,
  },
  rawDatabaseList: {
    type: Array as PropType<ComposedDatabase[]>,
    default: () => [],
  },
  transferSource: {
    type: String as PropType<TransferSource>,
    required: true,
  },
  instanceFilter: {
    type: Object as PropType<ComposedInstance>,
    default: undefined,
  },
  searchText: {
    type: String,
    default: "",
  },
});

const emit = defineEmits<{
  (event: "change", src: TransferSource): void;
  (event: "select-instance", instance: ComposedInstance | undefined): void;
  (event: "search-text-change", searchText: string): void;
}>();

const state = reactive<LocalState>({
  transferSource: props.transferSource,
});

const nonEmptyInstanceUidSet = computed(() => {
  const instanceList = props.rawDatabaseList.map((db) => db.instanceEntity);
  return new Set(instanceList.map((instance) => instance.uid));
});

const changeInstanceFilter = (uid: string | undefined) => {
  if (!uid || uid === String(UNKNOWN_ID)) {
    return emit("select-instance", undefined);
  }
  emit("select-instance", useInstanceV1Store().getInstanceByUID(uid));
};

const filterInstance = (instance: ComposedInstance) => {
  if (instance.uid === String(UNKNOWN_ID)) return true; // "ALL" can be displayed.
  return nonEmptyInstanceUidSet.value.has(instance.uid);
};

watch(
  () => props.transferSource,
  (src) => (state.transferSource = src)
);

watch(
  () => state.transferSource,
  (src) => {
    if (src !== props.transferSource) {
      emit("change", src);
    }
  }
);
</script>
