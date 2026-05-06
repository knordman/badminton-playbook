import { ref } from "vue";

export type StatsMode = "Games" | "Points" | "Single" | "Double";

const modes: StatsMode[] = ["Games", "Points", "Single", "Double"];

export const statsMode = ref<StatsMode>("Games");

export function cycleStatsMode() {
  const i = modes.indexOf(statsMode.value);
  statsMode.value = modes[(i + 1) % modes.length];
}
