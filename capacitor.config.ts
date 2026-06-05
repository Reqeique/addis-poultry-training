import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.addispoultry.app',
  appName: 'AddisPoultry',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;
