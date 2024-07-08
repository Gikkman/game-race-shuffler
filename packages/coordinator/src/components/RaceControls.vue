<script async setup lang="ts">
import { ref } from "vue";
import { getAdminKey } from "../scripts/KeyValueStore";
import { RaceStateOverview, RoomOverview } from "@grs/shared";
import SwapGameControls from "./race-controls/SwapGameControls.vue";
import RacePhaseControls from "./race-controls/RacePhaseControls.vue";
import GameCompleteControls from "./race-controls/GameCompleteControls.vue";

const props = defineProps<{ room: RoomOverview, raceState: RaceStateOverview }>();
const adminKey = ref( getAdminKey(props.room.roomName) );
const adminKeyFieldDisabled = ref(!!adminKey.value);

function copyAdminKey() {
  if(adminKey.value)
    navigator.clipboard.writeText(adminKey.value)
}
</script>

<template>
  <div class="pane-v control-pane">
    <RacePhaseControls :race-state="raceState" :room-name="room.roomName" :admin-key="adminKey"></RacePhaseControls>
    <details>
      <summary>Admin Controls</summary>
      <div class="pane-v">
        <SwapGameControls :race-state="raceState" :room-name="room.roomName" :admin-key="adminKey"></SwapGameControls>
        <GameCompleteControls :race-state="raceState" :room-name="room.roomName" :admin-key="adminKey"></GameCompleteControls>
        <div class="control-pane">
          <p class="admin-key">Admin Key</p>
          <div class="pane-h">
            <input name="adminKey" :disabled="adminKeyFieldDisabled" v-model="adminKey" autocomplete="off" type="password" placeholder="Admin Key">
            <button :disabled="!adminKey" @click="copyAdminKey">COPY</button>
          </div>
        </div>
      </div>
    </details>
  </div>
</template>

<style scoped>
.swap-game-select {
  flex: 1;
}
.admin-key {
  margin: 0px;
}
.control-pane {
  margin: 12px 0px 0px;
}

summary {
  font-weight: bold;
}
details > summary {
  padding: 16px 0px 8px;
  list-style: none;
}
summary::after {
  content: " ►";
  padding: 8px;
}
details[open] summary:after {
  content: " ▼";
  padding: 8px;
}
details > div {
  border-style: dotted;
  padding-bottom: 8px;
}
</style>
