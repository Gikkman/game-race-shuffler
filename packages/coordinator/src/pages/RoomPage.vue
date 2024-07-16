<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import { RaceStateOverview, RoomOverview } from '@grs/shared';
import RaceStateView from '../components/RaceStateView.vue';
import RaceControls from '../components/RaceControls.vue';
import * as TipcListener from '../scripts/TipcListener';
import * as ServerApi from "../scripts/ServerApi";
import * as Router from '../scripts/Router';
import RaceFooter from '../components/RaceFooter.vue';
import { TipcSubscription } from 'tipc';

const roomName = Router.getRoute().params["name"] as string;

const connected = TipcListener.connected;
const room = ref<RoomOverview>();
const raceState = ref<RaceStateOverview>();
const ready = ref(false);

let tipcSub: TipcSubscription|undefined = undefined;
TipcListener.init().then(async () => {
  ServerApi.getRoom(roomName).then(roomResponse => {
    room.value = roomResponse;
    raceState.value = roomResponse.raceStateData;
  })
  .finally(() => {
    ready.value = true;
  })
}).finally(() => {
  console.info("Subscribing listener for room " + roomName);
  tipcSub = TipcListener.getClient().addListener("raceStateUpdate", update => {
    if (update.roomName === roomName) {
      console.log(update.changes)
      raceState.value = update;
    }
  });
})

onUnmounted(() =>{
  console.info("Unsubscribing listener for room " + roomName);
  tipcSub?.unsubscribe()
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
      <div v-if="raceState && room">
        <RaceStateView :raceState />
        <RaceControls :room :raceState />
        <RaceFooter :room />
      </div>
      <h1 v-else>
        Room not found
      </h1>
    </div>
  </div>
</template>

<style>
.main {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin: auto;
}
.main > div {
  width: 100%;
}
.control-pane {
  margin: 12px 0px 0px;
}
.control-heading {
  text-decoration-line: underline;
}
</style>
