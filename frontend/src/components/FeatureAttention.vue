<template>
  <BBAttention
    :class="customClass"
    :style="`WARN`"
    :title="$t(`subscription.features.${featureKey}.title`)"
    :description="descriptionText"
    :action-text="actionText"
    @click-action="onClick"
  />
</template>

<script lang="ts" setup>
import { PropType, computed } from "vue";
import { FeatureType, planTypeToString } from "@/types";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useSubscriptionV1Store, pushNotification } from "@/store";
import { PlanType } from "@/types/proto/v1/subscription_service";

const props = defineProps({
  feature: {
    required: true,
    type: String as PropType<FeatureType>,
  },
  description: {
    require: false,
    default: "",
    type: String,
  },
  customClass: {
    require: false,
    default: "",
    type: String,
  },
});

const router = useRouter();
const { t } = useI18n();
const subscriptionStore = useSubscriptionV1Store();

const actionText = computed(() => {
  if (!subscriptionStore.canTrial) {
    return t("subscription.upgrade");
  }
  if (subscriptionStore.canUpgradeTrial) {
    return t("subscription.upgrade-trial-button");
  }
  return t("subscription.start-n-days-trial", {
    days: subscriptionStore.trialingDays,
  });
});

const descriptionText = computed(() => {
  const startTrial = subscriptionStore.canUpgradeTrial
    ? t("subscription.upgrade-trial")
    : t("subscription.trial-for-days", {
        days: subscriptionStore.trialingDays,
      });
  if (!Array.isArray(subscriptionStore.featureMatrix.get(props.feature))) {
    return `${props.description}\n${startTrial}`;
  }

  const requiredPlan = subscriptionStore.getMinimumRequiredPlan(props.feature);
  const trialText = t("subscription.required-plan-with-trial", {
    requiredPlan: t(
      `subscription.plan.${planTypeToString(requiredPlan)}.title`
    ),
    startTrial: startTrial,
  });

  return `${props.description}\n${trialText}`;
});

const onClick = () => {
  if (subscriptionStore.canTrial) {
    const isUpgrade = subscriptionStore.canUpgradeTrial;
    subscriptionStore.trialSubscription(PlanType.ENTERPRISE).then(() => {
      pushNotification({
        module: "bytebase",
        style: "SUCCESS",
        title: t("common.success"),
        description: isUpgrade
          ? t("subscription.successfully-upgrade-trial", {
              plan: t(
                `subscription.plan.${planTypeToString(
                  subscriptionStore.currentPlan
                )}.title`
              ),
            })
          : t("subscription.successfully-start-trial", {
              days: subscriptionStore.trialingDays,
            }),
      });
    });
  } else {
    router.push({ name: "setting.workspace.subscription" });
  }
};

const featureKey = props.feature.split(".").join("-");
</script>
