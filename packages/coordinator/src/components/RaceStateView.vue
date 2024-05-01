<script setup lang="ts">
import { RaceStateOverview } from '@grs/shared';

defineProps<{ raceState: RaceStateOverview }>();

</script>

<template>
  <div>
    Race phase: {{ raceState.phase }}
  </div>
  <div>
    Current game: {{ raceState.currentGame?.name ?? "" }}
  </div>
  <div>
    <h2>Participants</h2>
    <div v-for="participant in raceState.participants">
      {{ participant.name }} - {{ participant.score }} <span v-if="participant.leader" class="leader">(Leader)</span>
    </div>
  </div>
  <div>
    <h2>Games</h2>
    <div v-for="game in raceState.games">
      {{ game.name }} - Completed by: {{ game.completedByParticipant ?? "" }}
    </div>
  </div>
</template>

<style scoped>
.leader {
  color: darkred;
  font-weight: bold;
}
</style>
