<script async setup lang="ts">
import * as ServerApi from "../../scripts/ServerApi";
import { RaceStateOverview } from "@grs/shared";

const props = defineProps<{ raceState: RaceStateOverview, roomName: string, adminKey?: string }>();

function startRace() {
  if(!props.adminKey) return;

  if(confirm("Really start race?")) {
    ServerApi.changePhase({adminKey: props.adminKey, roomName: props.roomName, phase: "ACTIVE"})
  }
}
function pauseRace() {
  if(!props.adminKey) return;

  if(confirm("Really pause race?")) {
    ServerApi.changePhase({adminKey: props.adminKey, roomName: props.roomName, phase: "PAUSED"})
  }
}
</script>

<template>
<div class="pane-h control-pane" style="flex: 1;">
  <button :disabled="!adminKey" @click="startRace" v-if="raceState.phase!=='ACTIVE'" >Start Race</button>
  <button :disabled="!adminKey" @click="pauseRace" v-else                            >Pause Race</button>
</div>
</template>

<style scoped>
button {
  width: 80%;
}
</style>
