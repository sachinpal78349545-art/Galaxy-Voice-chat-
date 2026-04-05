# Galaxy Voice Chat — Dual Platform Project

## Overview
Two parallel apps sharing Firebase project (`chalotalk-67106`):
1. **Galaxy Mobile** (`artifacts/galaxy-mobile/`) — React Native (Expo) voice chat app with Agora RTC, Midnight Nebula theme
2. **Galaxy Web / ChaloTalk** (`artifacts/galaxy-web/`) — React + Vite web app, mobile-first (max-width 400px), dark galaxy theme, multi-auth, Firebase Realtime DB

---

## Galaxy Web / ChaloTalk (Production)

### Architecture
- **Framework**: React + Vite + TypeScript
- **Location**: `artifacts/galaxy-web/`
- **Backend**: Firebase Realtime Database (all data), Firebase Storage (images/avatars/voice)
- **Auth**: Firebase Google Auth (popup + redirect), Phone OTP (demo), Guest (anonymous)
- **Voice**: Agora Web SDK (`agora-rtc-sdk-ng`) with AEC/ANS/AGC
- **Data**: Fully Firebase-powered (no localStorage for core data)

### App Structure
```
artifacts/galaxy-web/src/
  App.tsx                  — Root: auth flow, page routing, ToastProvider, online presence,
                             notification bell + panel, chat unread badge
  index.css                — Global styles, animations (giftFly, giftReveal, giftBounce),
                             skeleton, toast
  lib/
    firebase.ts            — Firebase SDK init (auth, db, storage)
    voiceService.ts        — Agora RTC: join/leave/mute, AEC/ANS/AGC, volume monitoring,
                             active speaker detection, per-user volume control
    userService.ts         — User CRUD, online presence, follow/unfollow, daily rewards,
                             achievements, transactions, XP/level, gift sending,
                             block/unblock, friend requests, privacy settings, report user,
                             daily tasks (4 tasks with progress tracking)
    roomService.ts         — Firebase rooms CRUD, 12-seat management, real-time listeners,
                             room messages, seed data (5 rooms), raise hand, host controls,
                             co-host role (setCoHost, removeCoHost)
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
    AuthPage.tsx           — Google sign-in, Phone OTP login (demo), Guest login,
                             galaxy theme with feature cards
    HomePage.tsx           — Search bar, trending section, Firebase rooms, skeleton loading,
                             infinite scroll, online users strip, Hot/New/Following tabs
    RoomsPage.tsx          — Firebase room list, create room modal, real-time updates
    VoiceRoomPage.tsx      — 12-seat 4-column grid, real Agora voice (join/leave/mute),
                             co-host controls, animated gift system (fly/reveal/bounce),
                             gift leaderboard modal (daily/weekly/monthly tabs),
                             per-user volume sliders, room timer, room ID display
    ChatsPage.tsx          — Firebase real-time conversations, emoji picker (32 emojis),
                             image send, typing indicator, seen/delivered ticks (✔/✔✔),
                             voice message recording + VoicePlayer component,
                             chat reactions (double-tap to react), block user check
    ProfilePage.tsx        — Achievements modal, daily reward card with streak,
                             transaction history, wallet/recharge, XP bar,
                             friend requests panel, friends list, blocked users,
                             search users, report modal, privacy settings toggles,
                             daily tasks UI with progress bars
    EditProfilePage.tsx    — Photo upload with progress bar, emoji avatar picker,
                             form validation, confetti success animation
```

### Key Features
- **Real Agora Voice**: Join/leave/mute with AEC, ANS, AGC audio processing
- **Voice Rooms**: 12 seats in 4-column grid, speaking ring animation, host crown, raise hand
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
- **Multi-Auth**: Google OAuth, Phone OTP (demo mode), Guest anonymous login
- **Daily Rewards**: 50 base + streak bonus (up to +100), auto-claim on first login
- **Achievements**: 12 total (levels, coins, messages, streak, rooms, followers)
- **Real-time Chat**: Firebase-powered with typing indicators, image upload
- **Online Presence**: Firebase onDisconnect for live status tracking
- **Toast Notifications**: Global system for all user feedback
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
- `users/{uid}` — profile, coins, level, achievements, transactions, online status,
                   blockedUsers, friends, friendRequests, privacySettings, dailyTasks
- `rooms/{roomId}` — room config, 12 seats array, host info, coHosts
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
