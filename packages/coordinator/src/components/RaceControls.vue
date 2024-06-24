<script async setup lang="ts">
import { ref } from "vue";
import * as ServerApi from "../scripts/ServerApi";
import { getAdminKey } from "../scripts/KeyValueStore";

const props = defineProps<{ roomName: string }>();
const adminKey = ref( getAdminKey(props.roomName) );
const adminKeyFieldDisabled = ref(!!adminKey.value);

function copyAdminKey() {
  if(adminKey.value)
    navigator.clipboard.writeText(adminKey.value)
}

function startRace() {
  if(!adminKey.value) {
    return;
  }
  if(confirm("Really start race?")) {
    ServerApi.startRace({adminKey: adminKey.value, roomName: props.roomName})
  }
}
function swapGame() {
  if(!adminKey.value) {
    return;
  }
  if(confirm("Really swap game?")) {
    ServerApi.swapGame({adminKey: adminKey.value, roomName: props.roomName})
  }
}
</script>

<template>
  <div class="pane-v">
    <div class="pane-h">

      <button :disabled="!adminKey" @click="startRace">Start</button>
      <button :disabled="!adminKey" @click="swapGame">Swap</button>
    </div>
    <div>
      <h3>Admin Key</h3>
    </div>
    <div class="pane-h">
        <input name="adminKey" :disabled="adminKeyFieldDisabled" v-model="adminKey" autocomplete="off" type="password" placeholder="Admin Key">
        <button :disabled="!adminKey" @click="copyAdminKey">COPY</button>
    </div>
  </div>
</template>

<style scoped>

</style>
