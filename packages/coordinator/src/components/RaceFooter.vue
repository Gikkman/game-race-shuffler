<script async setup lang="ts">
import { RoomOverview } from '@grs/shared';

defineProps<{ room: RoomOverview }>();

function toDateTime(time: number) {
  const date = new Date(time);
  return `${date.toLocaleString(navigator.language)}`
}

</script>

<template>
  <div class="pane-v footer tiny-text">
    <p>This room was created at {{ toDateTime(room.createdAt) }}</p>
    <p v-if="room.archivedAt">This room was archived at {{ toDateTime(room.archivedAt) }}</p>
    <p v-else>The room will be archived at {{ toDateTime(room.liveUntil) }}</p>
  </div>
</template>

<style scoped>
p {
  font-style: italic;
  margin: 0px;
}
.footer {
  margin-top: 32px;
}
</style>
