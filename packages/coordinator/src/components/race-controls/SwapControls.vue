<script async setup lang="ts">
import { computed } from "vue";
import * as ServerApi from "../../scripts/ServerApi";

const props = defineProps<{ roomName: string, adminKey?: string }>();

const disabled = computed(() => !props.adminKey);

function clearSwapQueue() {
  if(!props.adminKey) return;

  if(confirm("Really set 'Queue Size' to '0'?")) {
    ServerApi.clearSwapQueue({adminKey: props.adminKey, roomName: props.roomName})
  }
}
function clearBlockTimer() {
  if(!props.adminKey) return;

  if(confirm("Really set 'Blocked Until' to '-'?")) {
    ServerApi.clearBlockTimer({adminKey: props.adminKey, roomName: props.roomName})
  }
}
function setBlockTimer() {
  if(!props.adminKey) return;

  if(confirm("Really set 'Blocked Until'?")) {
    ServerApi.setBlockTimer({adminKey: props.adminKey, roomName: props.roomName})
  }
}
</script>

<template>
<div class="pane-v control-pane">
  <div class="control-heading">
    Swapping Controls
  </div>
  <div class="pane-h" style="flex: 1; gap: 24px">
    <button :disabled="disabled" @click="clearSwapQueue" >Clear Swap Queue</button>
    <button :disabled="disabled" @click="clearBlockTimer">Clear Block Timer</button>
    <button :disabled="disabled" @click="setBlockTimer"  >Set Block Timer</button>
  </div>
</div>
</template>

<style scoped>
button {
  width: flex 1;
  font-size: 12px;
}
</style>
