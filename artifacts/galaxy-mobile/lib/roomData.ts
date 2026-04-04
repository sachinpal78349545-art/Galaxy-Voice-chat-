export interface Room {
  id: string;
  name: string;
  host: string;
  listeners: number;
  seats_taken: number;
  seats: number;
  tag: string;
  tagColor: string;
  isLive: boolean;
  description: string;
  channel: string; // Agora channel name
}

export interface RoomSeat {
  id: string;
  position: number; // 0 = host, 1-8 = speakers
  userId: string | null;
  displayName: string | null;
  emoji: string;
  isMuted: boolean;
  isSpeaking: boolean;
  isHost: boolean;
}

export const ROOMS: Room[] = [
  {
    id: "r1", name: "Midnight Chill Lounge",  host: "StarGazer_01", listeners: 142, seats_taken: 8,  seats: 10, tag: "Chill",   tagColor: "#6C5CE7", isLive: true,  description: "Relax and vibe in zero-gravity. 🌌", channel: "galaxy_r1",
  },
  {
    id: "r2", name: "Nebula Beats Drop",       host: "CosmicDJ",     listeners: 88,  seats_taken: 5,  seats: 6,  tag: "Music",  tagColor: "#00CEC9", isLive: true,  description: "Drop beats in the cosmos. 🎵",       channel: "galaxy_r2",
  },
  {
    id: "r3", name: "Galaxy Talks — Tech",     host: "VoidWalker",   listeners: 56,  seats_taken: 3,  seats: 8,  tag: "Talk",   tagColor: "#FFD700", isLive: true,  description: "Space-level tech discussion. 💡",    channel: "galaxy_r3",
  },
  {
    id: "r4", name: "Space Karaoke Night",     host: "NightOwl_X",   listeners: 230, seats_taken: 12, seats: 12, tag: "Karaoke",tagColor: "#ff6482", isLive: true,  description: "Sing to the stars! 🎤",              channel: "galaxy_r4",
  },
  {
    id: "r5", name: "Coding in the Cosmos",    host: "Dev_Nebula",   listeners: 44,  seats_taken: 2,  seats: 6,  tag: "Tech",   tagColor: "#A29BFE", isLive: true,  description: "Code while floating in space. 🚀",   channel: "galaxy_r5",
  },
  {
    id: "r6", name: "Love & Stardust",         host: "LunaRose",     listeners: 118, seats_taken: 7,  seats: 8,  tag: "Romance",tagColor: "#ff7675", isLive: true,  description: "Love stories under nebula skies. ❤️", channel: "galaxy_r6",
  },
  {
    id: "r7", name: "Zero Gravity Comedy",     host: "SpaceFool",    listeners: 77,  seats_taken: 6,  seats: 6,  tag: "Comedy", tagColor: "#00e676", isLive: true,  description: "Laugh like you're weightless. 😂",    channel: "galaxy_r7",
  },
  {
    id: "r8", name: "Interstellar Debates",    host: "ArgonKnight",  listeners: 63,  seats_taken: 5,  seats: 10, tag: "Debate", tagColor: "#7df9ff", isLive: true,  description: "Clash of interstellar minds. ⚡",     channel: "galaxy_r8",
  },
];

const SEATS_TEMPLATE: Omit<RoomSeat, "id">[] = [
  { position: 0, userId: "host",  displayName: "Host",       emoji: "🌟", isMuted: false, isSpeaking: true,  isHost: true  },
  { position: 1, userId: "u1",    displayName: "CosmicDJ",   emoji: "🎵", isMuted: false, isSpeaking: false, isHost: false },
  { position: 2, userId: "u2",    displayName: "LunaRose",   emoji: "🌙", isMuted: true,  isSpeaking: false, isHost: false },
  { position: 3, userId: null,    displayName: null,          emoji: "",   isMuted: false, isSpeaking: false, isHost: false },
  { position: 4, userId: "u3",    displayName: "VoidWalker", emoji: "🌌", isMuted: false, isSpeaking: true,  isHost: false },
  { position: 5, userId: null,    displayName: null,          emoji: "",   isMuted: false, isSpeaking: false, isHost: false },
  { position: 6, userId: "u4",    displayName: "NightOwl",   emoji: "🦉", isMuted: true,  isSpeaking: false, isHost: false },
  { position: 7, userId: null,    displayName: null,          emoji: "",   isMuted: false, isSpeaking: false, isHost: false },
  { position: 8, userId: "u5",    displayName: "SpaceFool",  emoji: "🤡", isMuted: false, isSpeaking: false, isHost: false },
];

// Customize seats per room
const ROOM_OVERRIDES: Record<string, Partial<typeof SEATS_TEMPLATE[0]>[]> = {
  r3: [
    { displayName: "VoidWalker", emoji: "🌌" },
    { displayName: "ArgonKnight", emoji: "⚡" },
    { displayName: "Dev_Nebula",  emoji: "💻", isMuted: false, isSpeaking: true },
    {},
    { userId: null },
    {},
    { userId: null },
    {},
    { userId: null },
  ],
};

export function getMockSeats(roomId: string, hostName: string): RoomSeat[] {
  const overrides = ROOM_OVERRIDES[roomId] ?? [];
  return SEATS_TEMPLATE.map((template, i) => {
    const override = overrides[i] ?? {};
    const merged = { ...template, ...override };
    return {
      ...merged,
      id: `seat_${i}`,
      displayName: i === 0 ? hostName : merged.displayName,
    } as RoomSeat;
  });
}

export const LISTENER_EMOJIS = ["😊", "🎵", "🌟", "🦉", "🌙", "🚀", "💫", "🔥", "🎤", "🌌", "⚡", "💻"];
