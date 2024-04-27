<script setup lang="ts">
import { Types } from '@grs/shared';

defineProps<{ state: Types.RaceStateOverview }>();

</script>

<template>
  <div>
    Race phase: {{  state.phase }}
  </div>
  <div>
    Current game: {{ state.currentGame ?? "" }}
  </div>
  <div>
    <h2>Participants</h2>
    <div v-for="participant in state.participants">
      {{ participant.name }} - {{  participant.score }} <span v-if="participant.leader" class="leader">(Leader)</span>
    </div>
  </div>
  <div>
    <h2>Games</h2>
    <div v-for="game in state.games">
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
