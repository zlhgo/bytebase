<template>
  <div>
    <SlowQueryPanel
      v-if="database"
      v-model:filter="filter"
      :filter-types="['time-range']"
      :show-project-column="false"
      :show-environment-column="false"
      :show-instance-column="false"
      :show-database-column="false"
    />
  </div>
</template>

<script lang="ts" setup>
import { shallowRef, watch } from "vue";

import type { ComposedDatabase } from "@/types";
import {
  type SlowQueryFilterParams,
  SlowQueryPanel,
  defaultSlowQueryFilterParams,
} from "@/components/SlowQuery";

const props = defineProps<{
  database: ComposedDatabase;
}>();

const filter = shallowRef<SlowQueryFilterParams>({
  ...defaultSlowQueryFilterParams(),
  environment: props.database.instanceEntity.environmentEntity,
  instance: props.database.instanceEntity,
  database: props.database,
});

watch(
  () => props.database.name,
  () => {
    filter.value.environment = props.database.instanceEntity.environmentEntity;
    filter.value.instance = props.database.instanceEntity;
    filter.value.database = props.database;
  }
);
</script>
