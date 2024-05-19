<script async setup lang="ts">
import { ref } from 'vue';
import { getRoomList } from '../scripts/ServerApi';

let rooms = ref<string[]>([])

async function updateRooms() {
  rooms.value = await getRoomList()
}
updateRooms()

</script>

<template>
  <div class="pane-v">
    <h2>Room List</h2>
    <ul class="rooms">
      <li v-for="room in rooms">
        <RouterLink :to="'/room/' + room">{{ room }}</RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.rooms {
  list-style: none;
  padding: 0px;
}
</style>
