<script setup lang="ts">
import { ref } from 'vue';
import { RaceStateOverview, RoomOverview } from '@grs/shared';
import RaceStateView from '../components/RaceStateView.vue';
import RaceControls from '../components/RaceControls.vue';
import * as TipcListener from '../scripts/TipcListener';
import * as ServerApi from "../scripts/ServerApi";
import * as Router from '../scripts/Router';
import RaceFooter from '../components/RaceFooter.vue';

const roomName = Router.getRoute().params["name"] as string;

const connected = TipcListener.connected;
const roomState = ref<RoomOverview>();
const raceState = ref<RaceStateOverview>();
const ready = ref(false);

TipcListener.init().then(async () => {
  ServerApi.getRoom(roomName).then(room => {
    roomState.value = room;
    raceState.value = room.raceStateData;
  })
  .finally(() => {
    ready.value = true;
  })
}).finally(() => {
  TipcListener.getClient().addListener("raceStateUpdate", update => {
    if (update.roomName === roomName) {
      raceState.value = update
    }
  });
})

</script>

<template>
  <div class="main">
    <div>
      <div v-if="connected">Connected</div>
      <div v-else>Not Connected</div>
    </div>
    <div>
      ----------------
    </div>
    <div v-if="ready">
      <div v-if="raceState && roomState">
        <RaceStateView :raceState />
        <br>
        <RaceControls :roomName />
        <br>
        <RaceFooter :roomState />
      </div>
      <h1 v-else>
        Room not found
      </h1>
    </div>
  </div>
</template>

<style scoped>
.main {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin: auto;
}
</style>
