<script setup>
</script>

<template>
  <RouterView />
</template>

<style>
#app {
  max-width: 1280px;
  min-width: 600px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.pane-v {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.pane-h {
  display: flex;
  flex-direction: row;
  gap: 16px;
  justify-content: center;
  align-items: center;
}

.tiny-text {
  font-size: 13px;
}
</style>
