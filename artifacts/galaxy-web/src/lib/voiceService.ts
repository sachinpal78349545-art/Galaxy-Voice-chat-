import AgoraRTC, {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng";

const APP_ID = "5a9957fd6a8047f48310fd0e5545d42c";

AgoraRTC.setLogLevel(4);

type SpeakerCb = (uid: number, volume: number) => void;
type RemoteUserCb = (uid: number, joined: boolean) => void;

class VoiceService {
  private client: IAgoraRTCClient | null = null;
  private localTrack: IMicrophoneAudioTrack | null = null;
  private _muted = false;
  private _speakerOff = false;
  private _ready = false;
  private _joined = false;
  private speakerCb: SpeakerCb | null = null;
  private remoteCb: RemoteUserCb | null = null;
  private volumeInterval: ReturnType<typeof setInterval> | null = null;
  private remoteVolumes: Map<number, number> = new Map();

  async init(): Promise<boolean> {
    try {
      this.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      this._ready = true;
      this.setupEventHandlers();
      return true;
    } catch (e) {
      console.warn("[Agora] SDK init error:", e);
      return false;
    }
  }

  private setupEventHandlers() {
    if (!this.client) return;
    this.client.on("user-published", async (user: IAgoraRTCRemoteUser, mediaType: string) => {
      if (mediaType === "audio") {
        await this.client!.subscribe(user, "audio");
        const remoteTrack = user.audioTrack;
        if (remoteTrack) {
          remoteTrack.play();
          const vol = this._speakerOff ? 0 : (this.remoteVolumes.get(Number(user.uid)) ?? 100);
          remoteTrack.setVolume(vol);
        }
        this.remoteCb?.(Number(user.uid), true);
      }
    });
    this.client.on("user-unpublished", (user: IAgoraRTCRemoteUser, mediaType: string) => {
      if (mediaType === "audio") {
        this.remoteCb?.(Number(user.uid), false);
      }
    });
    this.client.on("user-joined", (user: IAgoraRTCRemoteUser) => {
      this.remoteCb?.(Number(user.uid), true);
    });
    this.client.on("user-left", (user: IAgoraRTCRemoteUser) => {
      this.remoteCb?.(Number(user.uid), false);
    });
  }

  async join(channel: string, uid: number, token: string | null = null): Promise<void> {
    if (!this._ready || !this.client) {
      console.log(`[Agora] Not ready, demo mode for channel "${channel}"`);
      return;
    }
    try {
      await this.client.join(APP_ID, channel, token, uid);
      this.localTrack = await AgoraRTC.createMicrophoneAudioTrack({
        AEC: true,
        ANS: true,
        AGC: true,
      });
      await this.client.publish([this.localTrack]);
      this._joined = true;
      this.startVolumeMonitor();
      console.log(`[Agora] Joined channel: ${channel}`);
    } catch (e) {
      console.error("[Agora] join error:", e);
    }
  }

  async leave(): Promise<void> {
    this.stopVolumeMonitor();
    if (this.localTrack) {
      this.localTrack.stop();
      this.localTrack.close();
      this.localTrack = null;
    }
    if (this.client && this._joined) {
      try {
        await this.client.leave();
      } catch (e) {
        console.error("[Agora] leave error:", e);
      }
    }
    this._joined = false;
    this._muted = false;
  }

  async setMuted(muted: boolean): Promise<void> {
    this._muted = muted;
    if (this.localTrack) {
      await this.localTrack.setMuted(muted);
    }
  }

  setSpeakerOff(off: boolean): void {
    this._speakerOff = off;
    if (this.client && this._joined) {
      for (const user of this.client.remoteUsers) {
        if (user.audioTrack) {
          user.audioTrack.setVolume(off ? 0 : (this.remoteVolumes.get(Number(user.uid)) ?? 100));
        }
      }
    }
  }

  get speakerOff() { return this._speakerOff; }

  setRemoteVolume(uid: number, volume: number): void {
    this.remoteVolumes.set(uid, Math.max(0, Math.min(100, volume)));
    if (this._speakerOff) return;
    if (this.client && this._joined) {
      const users = this.client.remoteUsers;
      const user = users.find(u => Number(u.uid) === uid);
      if (user?.audioTrack) {
        user.audioTrack.setVolume(volume);
      }
    }
  }

  getRemoteVolume(uid: number): number {
    return this.remoteVolumes.get(uid) ?? 100;
  }

  onSpeaker(cb: SpeakerCb) { this.speakerCb = cb; }
  onRemoteUser(cb: RemoteUserCb) { this.remoteCb = cb; }

  private startVolumeMonitor() {
    this.stopVolumeMonitor();
    this.volumeInterval = setInterval(() => {
      if (!this.client || !this._joined) return;
      if (this.localTrack && !this._muted) {
        const vol = this.localTrack.getVolumeLevel();
        this.speakerCb?.(0, vol * 100);
      }
      for (const user of this.client.remoteUsers) {
        if (user.audioTrack) {
          const vol = user.audioTrack.getVolumeLevel();
          this.speakerCb?.(Number(user.uid), vol * 100);
        }
      }
    }, 200);
  }

  private stopVolumeMonitor() {
    if (this.volumeInterval) {
      clearInterval(this.volumeInterval);
      this.volumeInterval = null;
    }
  }

  get muted() { return this._muted; }
  get ready() { return this._ready; }
  get joined() { return this._joined; }
}

export const voiceService = new VoiceService();
