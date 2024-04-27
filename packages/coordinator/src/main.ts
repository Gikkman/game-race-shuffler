import * as TipcListener from './lib/TipcListener';

import { createApp } from 'vue';
import './style.css';
import App from './App.vue';

await TipcListener.init();

createApp(App).mount('#app');
