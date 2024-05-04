<script setup lang="ts">
import { RaceStateOverview } from '@grs/shared';

defineProps<{ raceState: RaceStateOverview }>();

</script>

<template>
  <div>
    Race phase: <span class="phase-text">{{ raceState.phase }}</span>
  </div>
  <div>
    Current game: {{ raceState.currentGame?.gameName ?? "" }}
  </div>
  <div>
    <h3>Participants</h3>
    <table>
      <tr>
        <th>User</th>
        <th>Score</th>
        <th>Leader</th>
      </tr>
      <tr v-for="participant in raceState.participants">
        <td>{{ participant.userName }}</td>
        <td>{{ participant.score }}</td>
        <td :class="{leader: participant.leader}">{{ participant.leader }}</td>
      </tr>
    </table>
  </div>
  <div>
    <h3>Games</h3>
    <table class="game-table">
      <tr>
        <th>Title</th>
        <th>Completed By</th>
      </tr>
      <tr v-for="game in raceState.games">
        <td>{{ game.gameName }}</td>
        <td>{{ game.completedByUser ?? "" }}</td>
      </tr>
    </table>
  </div>
</template>

<style scoped>
.phase-text {
  font-weight: bold;
}
.leader {
  color: darkred;
  font-weight: bold;
}

table {
  width: 100%;
}

table > tr > * {
  padding: 0px 10px;
}

.game-table > tr > * {
  text-align: left;
}
</style>
