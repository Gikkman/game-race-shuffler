<script setup lang="ts">
import { ref } from 'vue';
import { createRoom } from '../scripts/ServerApi';
import { storeAdminKey } from '../scripts/KeyValueStore';
import { CreateRoomRequest } from '@grs/shared';
import { router } from '../scripts/Router';

const roomName = ref("ESA2024");
const roomKey = ref("KEY-HERE");
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
    games: [...games.value]
  }
  const res = await createRoom(data);
  if (res) {
    storeAdminKey(roomName.value, res.adminKey)
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
  <div class="pane-v">
    <h2>Create Room</h2>
    <div class="pane-h">
      <input name="room-name" v-model="roomName" placeholder="Room name" />
      <input name="room-key" v-model="roomKey" type="password" placeholder="Room password" />
    </div>
    <div class="pane-h">
      <input class="game-input" name="new-game" v-model="newGame" placeholder="Game name" />
      <button @click="addGame">Add</button>
    </div>
    <table class="games">
      <tr v-for="game in games">
        <td class="game-title">{{ game }}</td>
        <td class="game-button"><button @click="removeGame(game)">X</button></td>
      </tr>
    </table>
    <div>
      <button @click="submit" type="submit">Create</button>
    </div>
  </div>
</template>

<style scoped>
.game-input {
  width: 80%;
}
.games {
  width: 100%;
}
.game-title {
  text-align: left;
}
.game-button {
  width: 1%;
}
</style>
