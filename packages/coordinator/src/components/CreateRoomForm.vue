<script setup lang="ts">
import { ref } from 'vue';
import { createRoom } from '../scripts/ServerApi';
import { CreateRoomRequest } from '@grs/shared';
import { router } from '../scripts/Router';

const roomName = ref("ESA2024");
const roomKey = ref("KEY-HERE");
const adminKey = ref("q1w2e3");
const games = ref(new Set<string>([
  "Super Mario Bros",
  "StarTropics",
  "Chip n Dale - Rescue Rangers",
  "Snake Rattle n Roll"
]))

const newGame = ref("")

async function submit() {
  const data: CreateRoomRequest = {
    roomName: roomName.value,
    roomKey: roomKey.value,
    adminKey: adminKey.value,
    games: [...games.value]
  }
  if (await createRoom(data)) {
    await router.push(`/room/${roomName.value}`)
  }
}

function addGame() {
  if (newGame.value.length < 1) return;
  games.value.add(newGame.value);
  newGame.value = ""
}

function removeGame(name: string) {
  games.value.delete(name)
}

</script>

<template>
  <input name="room-name" v-model="roomName" placeholder="Room name" />
  <input name="room-key" v-model="roomKey" type="password" placeholder="Room password" />
  <input name="admin-key" v-model="adminKey" type="password" placeholder="Room admin password" />
  <div v-for="game in games">
    <span>{{ game }}</span><button @click="removeGame(game)">X</button>
  </div>
  <input name="new-game" v-model="newGame" placeholder="Game name" />
  <button @click="addGame">Add</button>

  <button @click="submit" type="submit">Create</button>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
