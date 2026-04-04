import AgoraRTC, {
  IAgoraRTCClient,
  ILocalAudioTrack,
  IAgoraRTCRemoteUser,
} from 'agora-rtc-sdk-ng';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

const AGORA_APP_ID = '5a9957fd6a8047f48310fd0e5545d42c';

let client: IAgoraRTCClient | null = null;
let localAudioTrack: ILocalAudioTrack | null = null;
let currentChannel = '';
let speakingCallbacks: ((uid: string | number, speaking: boolean) => void)[] = [];

// ─── Join ─────────────────────────────────────────────────────────────

export async function joinVoiceRoom(
  channelName: string,
  uid: number,
  onUserJoin?: (user: IAgoraRTCRemoteUser) => void,
  onUserLeave?: (user: IAgoraRTCRemoteUser) => void,
): Promise<void> {
  if (client) await leaveVoiceRoom();

  AgoraRTC.setLogLevel(4);
  client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

  client.on('user-published', async (user, mediaType) => {
    await client!.subscribe(user, mediaType);
    if (mediaType === 'audio') user.audioTrack?.play();
    onUserJoin?.(user);
  });

  client.on('user-unpublished', (user) => {
    onUserLeave?.(user);
  });

  client.on('volume-indicator', (volumes) => {
    for (const v of volumes) {
      const isSpeaking = v.level > 5;
      speakingCallbacks.forEach(cb => cb(v.uid, isSpeaking));
    }
  });

  await client.join(AGORA_APP_ID, channelName, null, uid);

  try {
    localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    await client.publish(localAudioTrack);
    client.enableAudioVolumeIndicator();
  } catch (err) {
    console.warn('[voiceService] Mic access denied:', err);
  }

  currentChannel = channelName;
  console.log(`[voiceService] Joined channel: ${channelName} as uid: ${uid}`);
}

// ─── Leave ────────────────────────────────────────────────────────────

export async function leaveVoiceRoom(): Promise<void> {
  if (localAudioTrack) {
    localAudioTrack.stop();
    localAudioTrack.close();
    localAudioTrack = null;
  }
  if (client) {
    client.removeAllListeners();
    await client.leave();
    client = null;
  }
  speakingCallbacks = [];
  currentChannel = '';
}

// ─── Mic Control ─────────────────────────────────────────────────────

export async function toggleMic(muted: boolean): Promise<void> {
  if (localAudioTrack) {
    await localAudioTrack.setEnabled(!muted);
  }
}

export function isMicEnabled(): boolean {
  return localAudioTrack?.enabled ?? false;
}

// ─── Speaking Detection ───────────────────────────────────────────────

export function onSpeakingChanged(cb: (uid: string | number, speaking: boolean) => void): () => void {
  speakingCallbacks.push(cb);
  return () => {
    speakingCallbacks = speakingCallbacks.filter(c => c !== cb);
  };
}

// ─── Sync voice state to Firestore (for profile speaking animation) ──

export async function syncVoiceState(uid: string, speaking: boolean): Promise<void> {
  try {
    await setDoc(doc(db, 'users', uid), { isSpeaking: speaking }, { merge: true });
  } catch { }
}

// ─── Getters ─────────────────────────────────────────────────────────

export function getClient(): IAgoraRTCClient | null {
  return client;
}

export function getCurrentChannel(): string {
  return currentChannel;
}

export function isInRoom(): boolean {
  return client !== null;
}
