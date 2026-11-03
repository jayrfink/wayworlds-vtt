import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router.js';
import { useAuthStore } from './stores/auth.js';
import { initColorPackage } from './utils/themeManager.js';
import './main.css';

initColorPackage();

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const response = await originalFetch(input, init);
    if (response.status === 401) {
      const url = typeof input === 'string' ? input : (input?.url || '');
      const isPublicAuthEndpoint =
        url.includes('/api/auth/login') ||
        url.includes('/api/auth/setup') ||
        url.includes('/api/auth/me');
      if (!isPublicAuthEndpoint) {
        try {
          const auth = useAuthStore(pinia);
          if (auth.user) {
            await auth.fetchUser();
            if (!auth.isAuthenticated && router.currentRoute.value.path !== '/login') {
              router.push('/login');
            }
          }
        } catch {
          // Ignore errors during session recovery check
        }
      }
    }
    return response;
  };
}

app.mount('#app');
