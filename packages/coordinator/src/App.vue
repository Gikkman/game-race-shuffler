<script setup lang="ts">
import { RaceStateOverview } from '@grs/shared';
import { ref } from 'vue';
import StateView from './components/StateView.vue';
import { getClient } from "./lib/TipcListener";

const state = ref<RaceStateOverview>({games: [], participants: [], phase: "NEW"})
getClient().addListener("raceStateUpdate", (update) => {
  state.value = update;
  console.log(update)
})

</script>

<template>
  <div>
    <a href="https://vitejs.dev" target="_blank">
      <img src="/vite.svg" class="logo" alt="Vite logo" />
    </a>
    <a href="https://vuejs.org/" target="_blank">
      <img src="./assets/vue.svg" class="logo vue" alt="Vue logo" />
    </a>
  </div>
  <StateView :state=state />
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
