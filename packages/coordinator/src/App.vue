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
  gap: 8px;
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

input {
  height: 25px;
}

h3 {
  margin-block-start: 1em;
  margin-block-end: 0.3em;
}
</style>
