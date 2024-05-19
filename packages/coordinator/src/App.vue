<script setup>
</script>

<template>
  <RouterView />
</template>

<style>
.pane-v {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 16px;
}

.pane-h {
  display: flex;
  flex-direction: row;
  width: 100%;
  gap: 16px;
  justify-content: center;
  align-items: center;
}

input {
  height: 25px;
}
</style>
