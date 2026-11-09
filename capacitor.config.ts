import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.grainsmart.app',
  appName: 'GrainSmart',
  webDir: 'dist',
  backgroundColor: '#f2f2f7',
  android: { allowMixedContent: false },
};

export default config;
