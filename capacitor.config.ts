import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mercadoautonomo.app',
  appName: 'Mercado Autonomo',
  webDir: 'out',
  server: {
    url: 'http://192.168.1.9:3000', // Voltando para o IP da sua casa
    cleartext: true
  }
};

export default config;
