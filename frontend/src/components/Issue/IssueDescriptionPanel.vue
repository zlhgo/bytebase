<template>
  <!-- Description Bar -->
  <div class="flex justify-between items-center">
    <div class="textlabel !leading-7">{{ descriptionTitle }}</div>
    <div v-if="!create" class="space-x-2 mt-0.5">
      <button
        v-if="allowEditNameAndDescription && !state.editing"
        type="button"
        class="btn-icon"
        @click.prevent="beginEdit"
      >
        <heroicons-solid:pencil class="h-5 w-5" />
      </button>
      <button
        v-if="state.editing"
        type="button"
        class="px-2 leading-6 rounded-sm text-control hover:bg-control-bg-hover disabled:bg-control-bg disabled:opacity-50 disabled:cursor-not-allowed text-sm font-normal focus:ring-control focus:outline-none focus-visible:ring-2 focus:ring-offset-2"
        @click.prevent="cancelEdit"
      >
        {{ $t("common.cancel") }}
      </button>
      <button
        v-if="state.editing"
        type="button"
        class="px-2 border leading-6 border-control-border rounded-sm text-control bg-control-bg hover:bg-control-bg-hover disabled:bg-control-bg disabled:opacity-50 disabled:cursor-not-allowed text-sm font-normal focus:ring-control focus:outline-none focus-visible:ring-2 focus:ring-offset-2"
        :disabled="state.editDescription == issue.description"
        @click.prevent="saveEdit"
      >
        {{ $t("common.save") }}
      </button>
    </div>
  </div>
  <div class="mt-2 w-full px-[2px]">
    <textarea
      ref="editDescriptionTextArea"
      v-model="state.editDescription"
      :rows="create ? 5 : 3"
      class="w-full resize-none whitespace-pre-wrap border-white focus:border-white outline-none"
      :class="state.editing ? 'focus:ring-control focus-visible:ring-2' : ''"
      :style="
        state.editing
          ? ''
          : '-webkit-box-shadow: none; -moz-box-shadow: none; box-shadow: none'
      "
      :placeholder="$t('issue.add-some-description')"
      :readonly="!state.editing"
      @input="
            (e) => {
              sizeToFit(e.target as HTMLTextAreaElement);
              // When creating the issue, we will emit the event on keystroke to update the in-memory state.
              if (create) {
                updateDescription(state.editDescription);
              }
            }
          "
      @focus="
            (e) => {
              sizeToFit(e.target as HTMLTextAreaElement);
            }
          "
    ></textarea>
  </div>
</template>

<script lang="ts" setup>
import {
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  reactive,
  watch,
  computed,
} from "vue";
import { useI18n } from "vue-i18n";
import type { Issue } from "@/types";
import { isGrantRequestIssueType, sizeToFit } from "@/utils";
import { useExtraIssueLogic, useIssueLogic } from "./logic";

interface LocalState {
  editing: boolean;
  editDescription: string;
}

const { t } = useI18n();
const { issue, create } = useIssueLogic();
const { allowEditNameAndDescription, updateDescription } = useExtraIssueLogic();

const editDescriptionTextArea = ref();

const state = reactive<LocalState>({
  editing: false,
  editDescription: issue.value.description,
});

const isGrantRequestIssue = computed(() => {
  return !!issue.value && isGrantRequestIssueType(issue.value.type);
});

const descriptionTitle = computed(() => {
  return isGrantRequestIssue.value
    ? t("common.reason")
    : t("common.description");
});

const keyboardHandler = (e: KeyboardEvent) => {
  if (
    state.editing &&
    editDescriptionTextArea.value === document.activeElement
  ) {
    if (e.code == "Escape") {
      cancelEdit();
    } else if (e.code == "Enter" && e.metaKey) {
      if (state.editDescription != issue.value.description) {
        saveEdit();
      }
    }
  }
};

const resizeTextAreaHandler = () => {
  sizeToFit(editDescriptionTextArea.value);
};

onMounted(() => {
  document.addEventListener("keydown", keyboardHandler);
  window.addEventListener("resize", resizeTextAreaHandler);
  if (create.value) {
    state.editing = true;
    sizeToFit(editDescriptionTextArea.value);
  }
});

onUnmounted(() => {
  document.removeEventListener("keydown", keyboardHandler);
  window.removeEventListener("resize", resizeTextAreaHandler);
});

// Reset the edit state after creating the issue.
watch(create, (curNew, prevNew) => {
  if (!curNew && prevNew) {
    state.editing = false;
  }
});

watch(
  () => issue.value,
  (curIssue) => {
    state.editDescription = curIssue.description;
    nextTick(() => {
      sizeToFit(editDescriptionTextArea.value);
    });
  },
  { immediate: true }
);

const beginEdit = () => {
  state.editDescription = issue.value.description;
  state.editing = true;
  nextTick(() => {
    editDescriptionTextArea.value.focus();
  });
};

const saveEdit = () => {
  updateDescription(state.editDescription, (updatedIssue: Issue) => {
    state.editDescription = updatedIssue.description;
    state.editing = false;
    nextTick(() => {
      sizeToFit(editDescriptionTextArea.value);
    });
  });
};

const cancelEdit = () => {
  state.editDescription = issue.value.description;
  state.editing = false;
  nextTick(() => {
    sizeToFit(editDescriptionTextArea.value);
  });
};
</script>
