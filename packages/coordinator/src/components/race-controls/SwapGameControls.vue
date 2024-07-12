<script async setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import * as ServerApi from "../../scripts/ServerApi";
import { RaceStateOverview } from "@grs/shared";

const props = defineProps<{ raceState: RaceStateOverview, roomName: string, adminKey?: string }>();

// Create computed properties
const isRaceActive = computed(() => props.raceState.phase === "ACTIVE");
const currentGame = computed(() => {
  const game = props.raceState.currentGame;
  selectedGame.value = game;
  return game;
});
const possibleGameSwaps = computed(() => {
  const mapped = [...props.raceState.games];
  mapped.sort();
  return mapped;
});

// Create a ref for the current game
const selectedGame = ref(props.raceState.currentGame);
watch(currentGame, () => selectedGame.value = currentGame.value);

// Behavior functions
function swapGame() {
  if(!props.adminKey) return;

  if(confirm("Really swap game?")) {
    ServerApi.swapGame({adminKey: props.adminKey, roomName: props.roomName})
  }
}
function setGame() {
  // If we don't create this intermediate variable, the confirm dialogue sometimes gets incorrect values
  // I got no idea why, but creating this one here seems to address it
  const game = selectedGame.value;
  if(!props.adminKey) return;
  if(!game) return;
  if(game.logicalName === currentGame.value?.logicalName) return console.log("Selected game equal current game");;

  if(confirm("Really set game to " + game.gameName + " ?")) {
    ServerApi.setGame({adminKey: props.adminKey, roomName: props.roomName, gameName: game.gameName})
  }
  else {
    // Hack to get vue to process the state update correctly with regards to the select box
    nextTick(() => {
      selectedGame.value = currentGame.value;
    })
  }
}
</script>

<template>
<div class="pane-v control-pane" :disabled="!adminKey">
  <div class="control-heading">Game Controls</div>
  <div class="swap-game-select"  v-if="isRaceActive">
    <button @click="swapGame">Swap Game</button>
  </div>
  <div class="swap-game-select"  v-else>
    <select v-model="selectedGame" @change="setGame">
      <option v-for="game in possibleGameSwaps" :value="game">
        {{ game.gameName }}
      </option>
    </select>
  </div>
</div>
</template>

<style scoped>
.swap-game-select {
  flex: 1;
}
select {
  width: 90%;
}
</style>
