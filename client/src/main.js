import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router.js';
import { initColorPackage } from './utils/themeManager.js';
import './main.css';

initColorPackage();

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.mount('#app');
