export interface Medal {
  id: string;
  name: string;
  level: number;
  colorFrom: string;
  colorTo: string;
  borderColor: string;
}

export interface CPPartner {
  displayName: string;
  photoURL: string | null;
  intimacy: number;
}

export interface BackpackItem {
  id: string;
  name: string;
  category: "frame" | "bubble" | "entry";
  equipped: boolean;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export interface UserProfile {
  id: string;
  displayName: string;
  photoURL: string | null;
  userId: string;
  country: string;
  countryFlag: string;
  gender: "Male" | "Female" | "Other";
  age: number;
  bio: string;
  level: number;
  xp: number;
  xpTarget: number;
  coins: number;
  following: number;
  followers: number;
  visitors: number;
  isLive: boolean;
  frameTitle: string;
  vipBadge: string;
  rankBadge: string;
  medals: Medal[];
  agencyName: string;
  agencyMonthlyBeans: number;
  agencyTargetBeans: number;
  agencyValidDays: number;
  agencyTargetDays: number;
  agencyLiveHours: number;
  agencyTargetHours: number;
  cpPartner: CPPartner | null;
  backpack: BackpackItem[];
}

export const MOCK_PROFILE: UserProfile = {
  id: "usr_001",
  displayName: "Broken Heart...",
  photoURL: null,
  userId: "745159968",
  country: "India",
  countryFlag: "🇮🇳",
  gender: "Male",
  age: 18,
  bio: "I AM NO OFFICIAL, NO VOLUNTEER. JUST YOUR LOCAL SPACE TRAVELER.",
  level: 12,
  xp: 3500,
  xpTarget: 10000,
  coins: 59,
  following: 413,
  followers: 537,
  visitors: 727,
  isLive: true,
  frameTitle: "GALAXY GUARDIAN",
  vipBadge: "NEBULA STAR 7",
  rankBadge: "LEGEND 6",
  medals: [
    {
      id: "space_veteran",
      name: "SPACE VETERAN",
      level: 5,
      colorFrom: "#0f0a40",
      colorTo: "#4834d4",
      borderColor: "#6C5CE7",
    },
    {
      id: "explorer",
      name: "EXPLORER",
      level: 24,
      colorFrom: "#2d0057",
      colorTo: "#9c27b0",
      borderColor: "#ce93d8",
    },
  ],
  agencyName: "Nebula Agency",
  agencyMonthlyBeans: 3200,
  agencyTargetBeans: 10000,
  agencyValidDays: 8,
  agencyTargetDays: 15,
  agencyLiveHours: 12,
  agencyTargetHours: 40,
  cpPartner: null,
  backpack: [
    { id: "frm_nebula", name: "Nebula Frame", category: "frame", equipped: true, rarity: "epic" },
    { id: "bbl_star", name: "Star Bubble", category: "bubble", equipped: false, rarity: "rare" },
    { id: "ent_comet", name: "Comet Entry", category: "entry", equipped: false, rarity: "legendary" },
    { id: "frm_cosmos", name: "Cosmos Ring", category: "frame", equipped: false, rarity: "rare" },
  ],
};

export const VIP_LEVELS = [
  { level: 1, name: "Bronze",   color: "#cd7f32", bg: "#3d1f00", benefit: "Coin bonus +5%"        },
  { level: 2, name: "Silver",   color: "#C0C0C0", bg: "#404040", benefit: "XP boost +10%"         },
  { level: 3, name: "Gold",     color: "#ffd700", bg: "#6b4c00", benefit: "VIP room access"        },
  { level: 4, name: "Platinum", color: "#e5e4e2", bg: "#505050", benefit: "Custom avatar frame"    },
  { level: 5, name: "Diamond",  color: "#7df9ff", bg: "#003f7f", benefit: "Priority host queue"    },
  { level: 6, name: "Nebula",   color: "#da77ff", bg: "#3d006b", benefit: "Nebula entry effect"    },
  { level: 7, name: "Cosmic",   color: "#fff0a0", bg: "#7f3500", benefit: "Cosmic golden aura"     },
];

export const STORE_ITEMS = [
  { id: "s1", name: "Nebula Crown",  price: 1200, category: "frame",  rarity: "epic"      },
  { id: "s2", name: "Comet Tail",    price: 800,  category: "entry",  rarity: "rare"      },
  { id: "s3", name: "Galaxy Bubble", price: 650,  category: "bubble", rarity: "common"    },
  { id: "s4", name: "Black Hole",    price: 4500, category: "frame",  rarity: "legendary" },
];
