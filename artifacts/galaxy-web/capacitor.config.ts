import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.galaxy.voice',
  appName: 'Galaxy Voice Chat',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    hostname: 'localhost',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1A0F2E',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
