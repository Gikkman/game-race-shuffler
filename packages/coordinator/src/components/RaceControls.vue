<script async setup lang="ts">
import { ref } from "vue";
import * as ServerApi from "../scripts/ServerApi";

const props = defineProps<{ roomName: string }>();
const adminKey = ref<string>();

function startRace() {
  if(!adminKey.value) {
    return;
  }
  ServerApi.startRace({
    roomName: props.roomName,
    adminKey: adminKey.value,
  })
}
function swapGame() {
  if(!adminKey.value) {
    return;
  }
  ServerApi.swapGame({
    roomName: props.roomName,
    adminKey: adminKey.value,
  })
}
</script>

<template>
  <div>
    <input name="adminKey" v-model="adminKey" type="password" placeholder="Admin Key">
    <button @click="startRace">Start</button>
    <button @click="swapGame">Swap</button>
  </div>
</template>

<style scoped>
</style>
