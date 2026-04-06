# Galaxy Voice Chat — Dual Platform Project

## Overview
Two parallel apps sharing Firebase project (`chalotalk-67106`):
1. **Galaxy Mobile** (`artifacts/galaxy-mobile/`) — React Native (Expo) voice chat app with Agora RTC, Midnight Nebula theme
2. **Galaxy Web** (`artifacts/galaxy-web/`) — React + Vite web app, mobile-first (max-width 400px), dark galaxy theme, multi-auth, Firebase Realtime DB

---

## Galaxy Web (Production)

### Architecture
- **Framework**: React + Vite + TypeScript
- **Location**: `artifacts/galaxy-web/`
- **Backend**: Firebase Realtime Database (all data), Firebase Storage (images/avatars/voice)
- **Auth**: Firebase Email/Password + Google Auth (popup + redirect) + Phone OTP (demo) + Guest (anonymous)
- **Voice**: Agora Web SDK (`agora-rtc-sdk-ng`) with AEC/ANS/AGC
- **Data**: Fully Firebase-powered (no localStorage for core data)

### App Structure
```
artifacts/galaxy-web/src/
  App.tsx                  — Root: auth flow, page routing, ToastProvider, online presence,
                             notification bell + panel, chat unread badge
  index.css                — Global styles, Inter font, button animations (scale+ripple),
                             card hover/press states, skeleton shimmer, page transitions,
                             animations (giftFly, giftReveal, giftBounce, logoGlow,
                             speaking-ring, handWave, float, confetti, etc.)
  lib/
    firebase.ts            — Firebase SDK init (auth, db, storage)
    voiceService.ts        — Agora RTC: join/leave/mute, AEC/ANS/AGC, volume monitoring,
                             active speaker detection, per-user volume control
    userService.ts         — User CRUD, online presence, follow/unfollow (returns isMutual),
                             9-digit userId (atomic reservation via Firebase transaction),
                             canChat/canChatSync (mutual follow check), daily rewards,
                             achievements, transactions, XP/level, gift sending,
                             block/unblock, friend requests, privacy settings, report user,
                             daily tasks (4 tasks with progress tracking), searchUsers (name + userId)
    roomService.ts         — Firebase rooms CRUD, 10-seat management (2x5 grid), real-time
                             listeners, room messages, seed data (5 rooms), raise hand,
                             host controls, co-host role (setCoHost, removeCoHost)
    chatService.ts         — Firebase conversations, real-time messaging, typing indicators,
                             image upload, voice messages (record/upload/playback),
                             seen/delivered message status, chat reactions (double-tap),
                             unread count tracking
    giftService.ts         — Gift leaderboards (daily/weekly/monthly), gift history,
                             top senders/receivers ranking
    notificationService.ts — In-app notification system (follow, gift, friend request,
                             message, room invite, system), real-time subscription,
                             mark read/all read
    toastContext.tsx        — Global toast notification system (success/error/info/warning)
    storage.ts             — Legacy localStorage (unused for core data, types reference)
  pages/
    AuthPage.tsx           — Email signup/login, Google sign-in, Phone OTP (demo), Guest login,
                             galaxy theme with feature cards, state-machine auth modes
    SearchPage.tsx         — Dedicated search page with Users/Rooms tabs, user profile
                             cards with Follow/Message buttons, room search via fetchRooms
    NotificationPage.tsx   — Full notification center with Follow Back/Ignore/Message
                             actions, mark read, deep-link to chat via chatTargetUid
    supportService.ts      — Feedback form (bug/suggestion/feedback), help center articles (8)
    HomePage.tsx           — Gift leaderboard, quick-join category buttons, trending rooms,
                             search, infinite scroll, online users strip, Hot/New/Following tabs,
                             room cards with host avatar and user count (6/9 format)
    MomentPage.tsx         — Social feed page with sample moments, like/comment/share,
                             post composer, community updates
    RoomsPage.tsx          — Firebase room list, create room modal, real-time updates
    VoiceRoomPage.tsx      — 10-seat 2x5-column grid, real Agora voice (join/leave/mute),
                             co-host controls, animated gift system (fly/reveal/bounce),
                             gift leaderboard modal (daily/weekly/monthly tabs),
                             per-user volume sliders, room timer, room ID display,
                             bottom sheet on empty seat (Take Mic / Lock Mic),
                             slide-up profile card on occupied seat (ID, Level, Follow),
                             anti-screenshot CSS protection,
                             sticky room header (Share + ⋮ + ❌),
                             control panel (5 tabs: Profile/Followers/Mic/Banned/Events),
                             room DP gallery upload (Firebase Storage),
                             level progress bar, announcement editor,
                             enter permission (Everyone/Invite Only), mic seats count,
                             mode selector (Voice/Chat), admin count display,
                             enhanced user profile popup (VIP badge, intimacy,
                             gift wall, badges, Follow state, Chat/Gift/Invite Mic,
                             Make Admin/Remove Admin, Mute, Kick),
                             maxMics enforcement in seat rendering + join paths,
                             enterPermission enforcement in joinRoom
    ChatsPage.tsx          — Firebase real-time conversations, emoji picker (32 emojis),
                             image send, typing indicator, seen/delivered ticks (✔/✔✔),
                             voice message recording + VoicePlayer component,
                             chat reactions (double-tap to react), block user check
    ProfilePage.tsx        — Achievements modal, daily reward card with streak,
                             transaction history, wallet/recharge, XP bar,
                             friend requests panel, friends list, blocked users,
                             search users, report modal, privacy & notification settings,
                             daily tasks UI with progress bars, feedback form,
                             help center with 8 articles
    EditProfilePage.tsx    — Photo upload with progress bar, emoji avatar picker,
                             form validation, confetti success animation
```

### Key Features
- **Real Agora Voice**: Join/leave/mute with AEC, ANS, AGC audio processing
- **Voice Rooms**: 10 seats in 2x5 grid, speaking ring animation, host crown, raise hand, bottom sheet for empty seats, profile card popup
- **Navigation**: Home / Rooms / Chats / Moment / Mine (5-tab bottom nav)
- **Moments**: Social feed page with post composer and community updates
- **Anti-Screenshot**: CSS protection on Profile and Voice Room pages
- **9-Digit User ID**: Unique numeric ID per user, atomically reserved via Firebase transaction
- **Mutual Follow Chat Gate**: Both users must follow each other to unlock chat (enforced at data layer + UI)
- **Co-Host System**: Host can promote/demote co-hosts who share moderation powers
- **Host Controls**: Mute/kick/lock seats (host and co-host panel)
- **Animated Gift System**: 12 gifts with fly/reveal/bounce animations, coin deduction
- **Gift Leaderboards**: Daily/weekly/monthly top senders and receivers
- **Per-User Volume**: Individual volume sliders for each speaker
- **Seen/Delivered Status**: Single tick (sent), double tick (delivered), purple ticks (seen)
- **Voice Messages**: Record, upload to Firebase Storage, playback with VoicePlayer
- **Chat Reactions**: Double-tap messages to add emoji reactions
- **Friend Requests**: Send/accept/reject with notification integration
- **Block/Unblock**: Block users from messaging and interactions
- **Privacy Settings**: Toggle profile visibility, online status, chat permissions
- **Daily Tasks**: 4 tasks (join room, send messages, send gift, daily login) with coin rewards
- **Report System**: Report users with reason selection
- **Notification System**: In-app notifications for follows, gifts, friend requests, messages
- **Multi-Auth**: Email/Password signup+login, Google OAuth, Phone OTP (demo mode), Guest anonymous login
- **5-Tab Navigation**: Home, Search, Rooms, Chats, Profile (+ notification bell on Home)
- **Daily Rewards**: 50 base + streak bonus (up to +100), auto-claim on first login
- **Achievements**: 12 total (levels, coins, messages, streak, rooms, followers)
- **Real-time Chat**: Firebase-powered with typing indicators, image upload
- **Online Presence**: Firebase onDisconnect for live status tracking
- **Toast Notifications**: Global system for all user feedback
- **Gift Leaderboard on Home**: Weekly top gifters shown on home page
- **Quick Join Categories**: One-tap category buttons (Music, Chat, Gaming, etc.)
- **Support System**: Feedback form (bug/suggestion/general), Help center with 8 articles
- **Notification Settings**: Toggle push, message, gift, room invite notifications
- **Chat Unread Badge**: Live unread count on Chats tab
- **Page Transitions**: Fade/slide animations between pages
- **Skeleton Loading**: Shimmer placeholders for rooms, chats, etc.

### Firebase Config
- `apiKey`: `AIzaSyACJvjNecVmc-ooULC99pjlu6slWiQz_3o`
- `authDomain`: `chalotalk-67106.firebaseapp.com`
- `databaseURL`: `https://chalotalk-67106-default-rtdb.firebaseio.com`
- `projectId`: `chalotalk-67106`
- `storageBucket`: `chalotalk-67106.firebasestorage.app`

### Agora Config
- **App ID**: `5a9957fd6a8047f48310fd0e5345d42c`
- **SDK**: `agora-rtc-sdk-ng ^4.24.3`
- **Audio**: AEC (echo cancellation), ANS (noise suppression), AGC (gain control)
- **Volume**: 200ms polling interval for active speaker detection

### Data Architecture (Firebase Realtime DB)
- `users/{uid}` — profile, userId (9-digit), coins, level, achievements, transactions,
                   online status, blockedUsers, friends, friendRequests, privacySettings, dailyTasks
- `userIds/{userId}` — maps 9-digit userId → uid (atomic reservation)
- `rooms/{roomId}` — room config, 8 seats array, host info, coHosts
- `roomMessages/{roomId}/{msgId}` — voice room chat messages
- `conversations/{convId}` — participants, lastMessage, unread counts, typing
- `messages/{convId}/{msgId}` — chat messages (text, emoji, image, voice),
                                  status (sent/delivered/seen), reactions, voiceUrl
- `userConvs/{uid}/{convId}` — user's conversation index
- `notifications/{uid}/{notifId}` — user notifications (type, read, timestamp)
- `giftHistory/{recipientId}/{giftId}` — gift transaction records
- `reports/{reportId}` — user reports

### Design System
- **Background**: `#1A0F2E → #0F0F1A` gradient
- **Primary**: `#6C5CE7` / `#A29BFE`
- **Gold**: `#FFD700` (VIP, host elements)
- **Live green**: `#00e676`
- **Cards**: `rgba(255,255,255,0.04)` bg + accent borders

---

## Galaxy Mobile (Expo)

### Architecture
- **Type**: Expo React Native mobile app
- **Package name**: `com.sachin.galaxyvoicechat`
- **Location**: `artifacts/galaxy-mobile/`
- **Backend**: Firebase (same project: `chalotalk-67106`)
- **Voice**: Agora RTC via `react-native-agora`
- **Agora App ID**: `5a9957fd6a8047f48310fd0e5545d42c`

### App Structure
```
artifacts/galaxy-mobile/
  app/
    _layout.tsx              — Root Stack
    (tabs)/ → Home, Rooms, Chats, Moment, Mine
    room/[id].tsx            — Full-screen voice room
  components/ → GlassCard, AvatarFrame, LevelBar, etc.
  lib/ → roomData.ts, firebase.ts, profileData.ts
  services/ → agoraService.ts
```

### Design System (Midnight Nebula)
- **Background**: `#050112 → #0e0520 → #1a0b2e`
- **Accent**: `#6C5CE7` / `#A29BFE`
- **Gold**: `#FFD700`

### Key Dependencies
- `expo` ~54.0.27, `expo-router` ~6.0.17
- `expo-linear-gradient`, `react-native-reanimated` ~4.1.1
- `react-native-agora` (native build required for voice)
