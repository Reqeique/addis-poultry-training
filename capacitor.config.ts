import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.addispoultry.app',
  appName: 'My Chicken Addis',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;
