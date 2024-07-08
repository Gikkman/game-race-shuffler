<script setup lang="ts">
import { RaceGame, RaceStateOverview } from "@grs/shared";
import { computed, ref, watch } from "vue";

const NOT_COMPLETED_STRING = "- Not Completed -";
const props = defineProps<{ raceState: RaceStateOverview, roomName: string, adminKey?: string }>();

// Compute a list of participats, to show in the select boxes
const participants = computed(() => [NOT_COMPLETED_STRING, ...props.raceState.participants.map(p => p.userName)]);

// Create a ref for storing the selected participants for each game
const selectedParticipants = ref(
  props.raceState.games.map(game => getCompletedBy(game))
);

// Update selectedParticipants when props.raceState changes
watch(() => props.raceState, (newRaceState) => {
  selectedParticipants.value = newRaceState.games.map(game => getCompletedBy(game));
}, { deep: true });

function getCompletedBy(game: RaceGame) {
  return game.completedByUser || NOT_COMPLETED_STRING;
}

function onChangeCompletedBy(game: RaceGame, user: string) {
  console.log(user)
}
</script>

<template>
<div class="pane-v control-pane">
  <div>Game Completed By</div>
  <table>
    <tr><th>Title</th><th>Completed By</th></tr>
    <tr v-for="(game, index) in props.raceState.games" :key="game.logicalName">
      <td>{{ game.gameName }}</td>
      <td>
        <select v-model="selectedParticipants[index]" @change="onChangeCompletedBy(game, selectedParticipants[index])" :disabled="!props.adminKey">
          <option v-for="p in participants" :key="p" :value="p">{{ p }}</option>
        </select>
      </td>
    </tr>
  </table>
</div>
</template>

<style scoped>
table {
  width: 100%;
}
table > tr > * {
  padding: 2px 2px;
}
table > tr > * {
  text-align: left;
}
</style>