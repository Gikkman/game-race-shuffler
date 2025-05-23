<script setup lang="ts">
import { ref } from 'vue';
import { createRoom } from '../scripts/ServerApi';
import { storeAdminKey } from '../scripts/KeyValueStore';
import { CreateRoomRequest, SwapModeConfig } from '@grs/shared';
import { router } from '../scripts/Router';

const roomName = ref("TEST");
const roomKey = ref("TEST");
const games = ref(new Set<string>([
  "Battletoads",
  "Chip 'n Dale",
  "Marble Madness",
  "Super C",
  "Tetris"
]))

const swapModes = ref([
  {text: "Manual", value: "manual", desc: ""},
  {text: "Tiltify", value: "tiltify", desc: "Input campaign-id"},
  {text: "Timer", value: "timer", desc: "Input min|max"},
])
const swapModeSelected = ref(swapModes.value[0]);
const swapModeExtra = ref("");

const swapMinCooldown = ref(2);
const swapMaxCooldown = ref(15);

const newGame = ref("")

async function submit() {
  const data: CreateRoomRequest = {
    roomName: roomName.value,
    roomKey: roomKey.value,
    games: [...games.value],
    swapModeConfig: buildSwapModeConfig(),
    swapMinCooldown: swapMinCooldown.value,
    swapMaxCooldown: swapMaxCooldown.value,
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

function buildSwapModeConfig(): SwapModeConfig {
  const swapMode = swapModeSelected.value.value;
  const swapModeExtraData = swapModeExtra.value;
  if(swapMode === "manual" || swapMode === "tiltify" || swapMode === "timer")
    return {swapMode, swapModeExtraData}
  else
    throw "Unknown swap mode";
}

</script>

<template>
  <div class="pane-v">
    <h2>Create Room</h2>
    <!-- Room Config -->
    <div class="pane-h">
      <input name="room-name" v-model="roomName" autocomplete="off" placeholder="Room name"/>
      <input name="room-key" v-model="roomKey" type="password" autocomplete="off" placeholder="Room password" />
    </div>

    <h3>Games Config</h3>
    <div class="pane-h">
      <input class="wide-input" name="new-game" v-model="newGame" autocomplete="off" placeholder="Game name" />
      <button @click="addGame">Add</button>
    </div>
    <table class="games">
      <tr v-for="game in games">
        <td class="game-title">{{ game }}</td>
        <td class="game-button"><button @click="removeGame(game)">X</button></td>
      </tr>
    </table>

    <h3>Swap Config</h3>
    <div class="pane-h swap-mode-pane">
      <select class="swap-mode-select" v-model="swapModeSelected">
        <option v-for="mode in swapModes" :value="mode">
          {{ mode.text }}
        </option>
      </select>
      <input class="wide-input" v-model="swapModeExtra" autocomplete="off" :placeholder="swapModeSelected.desc" :disabled="swapModeSelected.value == 'manual'">
    </div>
    <div class="pane-h swap-cd-pane">
      <div class="pane-h">
        <div>Swap Min Cooldown</div><input class="num-input" type="number" v-bind:max="swapMaxCooldown" v-model="swapMinCooldown" min="2">
      </div>
      <div class="pane-h">
        <div>Swap Max Cooldown</div><input class="num-input" type="number" v-bind:min="swapMinCooldown" v-model="swapMaxCooldown">
      </div>
    </div>

    <div class="submit-button">
      <button @click="submit" type="submit">Create</button>
    </div>
  </div>
</template>

<style scoped>
.wide-input {
  flex: 1;
}
.games {
  flex: 1;
}
.game-title {
  text-align: left;
}
.game-button {
  width: 1%;
}
.swap-mode-pane {
  height: 40px;
}
.swap-mode-select {
  padding: 5px;
}
.submit-button {
  margin-top: 80px;
}
.swap-cd-pane {
  gap: 30px;
}
.num-input {
  width: 40px;
}
</style>
