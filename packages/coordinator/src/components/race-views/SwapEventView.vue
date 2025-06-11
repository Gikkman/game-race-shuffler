<script setup lang="ts">
import { RaceStateOverview } from '@grs/shared';
defineProps<{ raceState: RaceStateOverview }>();
</script>

<template>
  <div class="pane-v">
    <TransitionGroup name="list" tag="ul" class="events">
      <li v-for="event in raceState.swapEventData" class="msg" :key="event.t">
        {{ event.msg }}
      </li>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.events {
  list-style-type: none;
  margin: auto;
  padding: 0;
}

.msg {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  float: left;
  padding: 0 5px;
}

/** Animations for Swap Events */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: scaleX(-0.01) scaleY(-0.01);
}

.list-leave-active {
  position: absolute;
}
</style>
