import { createRouter, createWebHistory, useRoute } from 'vue-router';
import MainPage from '../pages/MainPage.vue';
import RoomPage from '../pages/RoomPage.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {path: '/', component: MainPage},
    {path: '/room/:name', component: RoomPage}
  ]
});

export function getRoute() {
  return useRoute();
}

export function navigate(path: string) {
  router.push(path);
}
