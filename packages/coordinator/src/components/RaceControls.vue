<script async setup lang="ts">
import { computed, ref } from "vue";
import { getAdminKey } from "../scripts/KeyValueStore";
import * as ServerApi from "../scripts/ServerApi";
import * as Router from "../scripts/Router";
import { RaceStateOverview, RoomOverview } from "@grs/shared";
import SwapGameControls from "./race-controls/SwapGameControls.vue";
import RacePhaseControls from "./race-controls/RacePhaseControls.vue";
import GameCompleteControls from "./race-controls/GameCompleteControls.vue";

const props = defineProps<{ room: RoomOverview, raceState: RaceStateOverview }>();
const adminKey = ref( getAdminKey(props.room.roomName) );
const adminKeyFieldDisabled = computed(() => !!adminKey.value);

function copyAdminKey() {
  if(adminKey.value)
    navigator.clipboard.writeText(adminKey.value)
}
async function archiveRoom() {
  if(!adminKey.value) return;
  if(confirm("Really archive room?")) {
    const ok = await ServerApi.archiveRoom({adminKey: adminKey.value, roomName: props.room.roomName});
    if(ok) {
      Router.navigate("/")
    }
  }
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

        <hr class="dashed">

        <div class="pane-h control-pane">
          <button class="danger" :disabled="!adminKey" @click="archiveRoom">Archive Room</button>
        </div>

        <div class="control-pane">
          <p class="admin-key-label">Admin Key</p>
          <div class="pane-h">
            <input class="admin-key-input" name="adminKey" :disabled="adminKeyFieldDisabled" v-model="adminKey" autocomplete="off" type="password" placeholder="Admin Key">
            <button :disabled="!adminKey" @click="copyAdminKey">COPY</button>
          </div>
        </div>
      </div>
    </details>
  </div>
</template>

<style scoped>
.control-pane {
  margin: 12px 0px 0px;
}
.danger {
  background-color: #f5a5a5;
  width: 80%;
}
.admin-key-label {
  margin-bottom: 0px;
}
.admin-key-input {
  width: 60%;
}

hr.dashed {
  width: 95%;
  border-top: 3px dotted;
  border-bottom: unset;
  border-left: unset;
  border-right: unset;
  border-color: rgb(139, 139, 139);
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
  border-color: rgb(139, 139, 139);
  padding-bottom: 8px;
}
</style>
