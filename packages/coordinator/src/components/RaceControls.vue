<script async setup lang="ts">
import { ref } from "vue";
import * as ServerApi from "../scripts/ServerApi";
import { getAdminKey } from "../scripts/KeyValueStore";
import { RaceStateOverview, RoomOverview } from "@grs/shared";
import SwapGameControls from "./race-controls/SwapGameControls.vue";

const props = defineProps<{ room: RoomOverview, raceState: RaceStateOverview }>();
const adminKey = ref( getAdminKey(props.room.roomName) );
const adminKeyFieldDisabled = ref(!!adminKey.value);

function copyAdminKey() {
  if(adminKey.value)
    navigator.clipboard.writeText(adminKey.value)
}

function startRace() {
  if(!adminKey.value) return;

  if(confirm("Really start race?")) {
    ServerApi.changePhase({adminKey: adminKey.value, roomName: props.room.roomName, phase: "ACTIVE"})
  }
}
function pauseRace() {
  if(!adminKey.value) return;

  if(confirm("Really pause race?")) {
    ServerApi.changePhase({adminKey: adminKey.value, roomName: props.room.roomName, phase: "PAUSED"})
  }
}
</script>

<template>
  <div class="pane-v control-pane">
    <details>
      <summary>Admin Controls</summary>
      <div class="pane-v">

        <div class="control-pane">
          <p class="admin-key">Admin Key</p>
          <div class="pane-h">
            <input name="adminKey" :disabled="adminKeyFieldDisabled" v-model="adminKey" autocomplete="off" type="password" placeholder="Admin Key">
            <button :disabled="!adminKey" @click="copyAdminKey">COPY</button>
          </div>
        </div>

        <div class="pane-h control-pane">
          <button :disabled="!adminKey" @click="startRace" v-if="raceState.phase!=='ACTIVE'" >Start Race</button>
          <button :disabled="!adminKey" @click="pauseRace" v-else                            >Pause Race</button>
        </div>

        <SwapGameControls :race-state="raceState" :room-name="room.roomName" :admin-key="adminKey"></SwapGameControls>

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
  margin: 8px 0px 0px;
  min-height: 40px;
}

summary {
  font-weight: bold;
}
details > summary {
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
</style>
