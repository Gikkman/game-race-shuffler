<script setup lang="ts">
import { RaceStateOverview } from '@grs/shared';

defineProps<{ raceState: RaceStateOverview }>();

let calculateSwapBlockedUntil = (unixMillis: number) => {
  if(unixMillis < Date.now()) return "-";
  return new Date(unixMillis).toLocaleTimeString(navigator.language).split(" ")[0];
}
</script>

<template>
  <div class="pane-v">
    <div class="pane-h">
      <div v-for="msg in raceState.swapEventData" class="msg">{{ msg }}</div>
    </div>
    <div class="pane-h">
      Race phase: <span class="phase-text">{{ raceState.phase }}</span>
    </div>
    <div class="pane-h">
      Current game: {{ raceState.currentGame?.gameName ?? "" }}
    </div>
    <h3>
      Swapping Insights
    </h3>
    <div class="pane-h tiny-text">
      <div>
        Min cooldown: {{ raceState.swapMinCooldown }} sec
      </div>
      <div>
        Max cooldown: {{ raceState.swapMaxCooldown }} sec
      </div>
    </div>
    <div class="pane-h">
      <div class="pane-v slim">
        <div>
          Queue Size
        </div>
        <div>
          {{ raceState.swapQueueSize }}
        </div>
      </div>
      <div class="pane-v slim">
        <div>
          Blocked Until
        </div>
        <div>
          {{ calculateSwapBlockedUntil(raceState.swapBlockedUntil) }}
        </div>
      </div>
    </div>
    <div class="pane-v">
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
    <div class="pane-v">
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
  </div>
</template>

<style scoped>
.phase-text {
  font-weight: bold;
}

.pane-v .slim {
  gap: 4px;
}

.leader {
  color: darkred;
  font-weight: bold;
}

.game-table > tr > * {
  text-align: left;
}

.msg {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
}
</style>
