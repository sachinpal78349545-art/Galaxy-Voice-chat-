/**
 * Galaxy Voice — Agora RTC Service
 *
 * This service wraps react-native-agora for real-time voice.
 * In Expo Go, Agora is unavailable (native module required).
 * Install the package and build natively to enable real voice:
 *
 *   pnpm --filter @workspace/galaxy-mobile add react-native-agora
 *   npx expo prebuild && npx expo run:ios
 *
 * The UI works fully in Expo Go with simulated state.
 * The service fails gracefully so the app doesn't crash.
 */

const AGORA_APP_ID =
  process.env["EXPO_PUBLIC_AGORA_APP_ID"] ?? "5a9957fd6a8047f48310fd0e5545d42c";

type RemoteUserCallback = (uid: number, joined: boolean) => void;
type SpeakingCallback = (uid: number, isSpeaking: boolean) => void;

class AgoraVoiceService {
  private engine: any = null;
  private available = false;
  private channelName = "";

  async initialize(): Promise<boolean> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createAgoraRtcEngine, ChannelProfileType, ClientRoleType } =
        require("react-native-agora");
      this.engine = createAgoraRtcEngine();
      await this.engine.initialize({
        appId: AGORA_APP_ID,
        channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
      });
      this.available = true;
      console.log("[Agora] Engine initialized ✅");
      return true;
    } catch (e) {
      console.log(
        "[Agora] Native module not available — running in UI demo mode. " +
          "Build natively with react-native-agora to enable real voice."
      );
      this.available = false;
      return false;
    }
  }

  async joinChannel(
    channelName: string,
    uid: number,
    token: string | null = null
  ): Promise<void> {
    if (!this.available || !this.engine) return;
    try {
      const { ClientRoleType } = require("react-native-agora");
      this.channelName = channelName;
      await this.engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
      await this.engine.enableAudio();
      await this.engine.joinChannel(token, channelName, uid, {});
      console.log(`[Agora] Joined channel: ${channelName}`);
    } catch (e) {
      console.error("[Agora] joinChannel error:", e);
    }
  }

  async leaveChannel(): Promise<void> {
    if (!this.available || !this.engine) return;
    try {
      await this.engine.leaveChannel();
      console.log("[Agora] Left channel");
    } catch (e) {
      console.error("[Agora] leaveChannel error:", e);
    }
  }

  async toggleMute(muted: boolean): Promise<void> {
    if (!this.available || !this.engine) return;
    try {
      await this.engine.muteLocalAudioStream(muted);
    } catch (e) {
      console.error("[Agora] toggleMute error:", e);
    }
  }

  onRemoteUser(callback: RemoteUserCallback): void {
    if (!this.available || !this.engine) return;
    try {
      this.engine.addListener("onUserJoined", (_: any, uid: number) =>
        callback(uid, true)
      );
      this.engine.addListener("onUserOffline", (_: any, uid: number) =>
        callback(uid, false)
      );
    } catch (e) {}
  }

  onAudioVolumeIndication(callback: SpeakingCallback): void {
    if (!this.available || !this.engine) return;
    try {
      this.engine.addListener(
        "onAudioVolumeIndication",
        (_: any, speakers: { uid: number; volume: number }[]) => {
          speakers.forEach(({ uid, volume }) => {
            callback(uid, volume > 10);
          });
        }
      );
    } catch (e) {}
  }

  destroy(): void {
    if (!this.available || !this.engine) return;
    try {
      this.engine.release();
      this.engine = null;
      this.available = false;
    } catch (e) {}
  }

  get isAvailable() {
    return this.available;
  }
}

export const voiceService = new AgoraVoiceService();
