import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.galaxy.voicechat',
  appName: 'Galaxy Voice Chat',
  webDir: 'dist',
  server: {
    url: 'https://galaxy-voice-chat-galaxy-web.vercel.app/',
    cleartext: true
  }
};

export default config;
