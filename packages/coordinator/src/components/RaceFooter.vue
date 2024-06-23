<script async setup lang="ts">
import { RoomOverview } from '@grs/shared';

defineProps<{ roomState: RoomOverview }>();

function toDateTime(time: number) {
  const date = new Date(time);
  return `${date.toLocaleString(navigator.language)}`
}

</script>

<template>
  <div class="pane-v footer tiny-text">
    <p>This room was created at {{ toDateTime(roomState.createdAt) }}</p>
    <p v-if="roomState.archivedAt">This room was archived at {{ toDateTime(roomState.archivedAt) }}</p>
    <p v-else>The room will be archived at {{ toDateTime(roomState.liveUntil) }}</p>
  </div>
</template>

<style scoped>
p {
  font-style: italic;
  margin: 0px;
}
.footer {
  margin-top: 48px;
}
</style>
