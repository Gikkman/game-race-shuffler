<script setup lang="ts">
import { ref } from 'vue';
import { RaceStateOverview } from '@grs/shared';
import RaceStateView from '../components/RaceStateView.vue';
import RaceControls from '../components/RaceControls.vue';
import * as TipcListener from '../scripts/TipcListener';
import * as ServerApi from "../scripts/ServerApi";
import * as Router from '../scripts/Router';

const roomName = Router.getRoute().params["name"] as string;

const connected = TipcListener.connected;
const raceState = ref<RaceStateOverview>();
const ready = ref(false);

TipcListener.init().then(async () => {
  ServerApi.getRoom(roomName).then(room => {
    raceState.value = room.raceState;
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
  <div>
    <div v-if="connected">Connected</div>
    <div v-else>Not Connected</div>
  </div>
  <div>
    ----------------
  </div>
  <div v-if="ready">
    <div v-if="raceState">
      <RaceStateView :raceState />
      <br>
      <RaceControls :roomName />
    </div>
    <h1 v-else>
      Room not found
    </h1>
  </div>
</template>

<style scoped></style>
