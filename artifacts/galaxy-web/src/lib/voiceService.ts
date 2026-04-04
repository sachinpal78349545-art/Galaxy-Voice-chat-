/**
 * Galaxy Voice — Agora Web SDK Service
 *
 * Replace APP_ID with your real Agora App ID.
 * Get one free at: https://console.agora.io
 *
 * Install:  pnpm --filter @workspace/galaxy-web add agora-rtc-sdk-ng
 * Then uncomment the import below.
 */

const APP_ID = "YOUR_AGORA_APP_ID_HERE";

// Agora Web SDK interface (real SDK types when installed)
interface IAgoraRTCClient {
  join(appId: string, channel: string, token: string | null, uid: number): Promise<void>;
  leave(): Promise<void>;
  publish(tracks: any[]): Promise<void>;
  unpublish(tracks: any[]): Promise<void>;
  on(event: string, handler: (...args: any[]) => void): void;
  off(event: string, handler: (...args: any[]) => void): void;
}

type RemoteUserCb = (uid: number, joined: boolean) => void;
type VolumeCb = (uid: number, volume: number) => void;

class VoiceService {
  private client: IAgoraRTCClient | null = null;
  private localTrack: any = null;
  private available = false;
  private isMuted = false;

  async init(): Promise<boolean> {
    try {
      // When agora-rtc-sdk-ng is installed, uncomment:
      // const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      // this.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      // AgoraRTC.setLogLevel(4);
      // this.available = true;
      console.log("[Agora] Demo mode — install agora-rtc-sdk-ng and add your App ID for real voice.");
      return false;
    } catch (e) {
      console.warn("[Agora] SDK not available:", e);
      return false;
    }
  }

  async join(channel: string, uid: number, token: string | null = null): Promise<void> {
    if (!this.available || !this.client) {
      console.log(`[Agora] Demo: would join channel "${channel}" uid=${uid}`);
      return;
    }
    try {
      await this.client.join(APP_ID, channel, token, uid);
      // const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      // this.localTrack = await AgoraRTC.createMicrophoneAudioTrack();
      // await this.client.publish([this.localTrack]);
      console.log(`[Agora] Joined channel: ${channel}`);
    } catch (e) {
      console.error("[Agora] join error:", e);
    }
  }

  async leave(): Promise<void> {
    if (!this.available || !this.client) return;
    try {
      if (this.localTrack) {
        this.localTrack.stop();
        this.localTrack.close();
        this.localTrack = null;
      }
      await this.client.leave();
    } catch (e) {
      console.error("[Agora] leave error:", e);
    }
  }

  async setMuted(muted: boolean): Promise<void> {
    this.isMuted = muted;
    if (!this.localTrack) return;
    try {
      await this.localTrack.setMuted(muted);
    } catch (e) {
      console.error("[Agora] setMuted error:", e);
    }
  }

  get muted() { return this.isMuted; }
  get ready() { return this.available; }
}

export const voiceService = new VoiceService();
