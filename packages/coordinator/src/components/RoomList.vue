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
  <h2>Room List</h2>
  <ul>
    <li v-for="room in rooms">
      <RouterLink :to="'/room/' + room">{{ room }}</RouterLink>
    </li>
  </ul>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
