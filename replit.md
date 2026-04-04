# Galaxy Voice Chat — Dual Platform Project

## Overview
Two parallel apps sharing Firebase project (`chalotalk-67106`):
1. **Galaxy Mobile** (`artifacts/galaxy-mobile/`) — React Native (Expo) voice chat app with Agora RTC, Midnight Nebula theme
2. **Galaxy Web / ChaloTalk** (`artifacts/galaxy-web/`) — React + Vite web app, mobile-first (max-width 400px), dark galaxy theme, Google Auth, Firebase Realtime DB

---

## Galaxy Web / ChaloTalk (Production)

### Architecture
- **Framework**: React + Vite + TypeScript
- **Location**: `artifacts/galaxy-web/`
- **Backend**: Firebase Realtime Database (all data), Firebase Storage (images/avatars)
- **Auth**: Firebase Google Auth (popup + redirect fallback)
- **Data**: Fully Firebase-powered (no localStorage for core data)

### App Structure
```
artifacts/galaxy-web/src/
  App.tsx                  — Root: auth flow, page routing, ToastProvider, online presence
  index.css                — Global styles, animations, skeleton, toast
  lib/
    firebase.ts            — Firebase SDK init (auth, db, storage)
    userService.ts         — User CRUD, online presence, follow/unfollow, daily rewards,
                             achievements, transactions, XP/level, gift sending
    roomService.ts         — Firebase rooms CRUD, 12-seat management, real-time listeners,
                             room messages, seed data (5 rooms), raise hand, host controls
    chatService.ts         — Firebase conversations, real-time messaging, typing indicators,
                             image upload, auto-reply for demo contacts, emoji messages
    toastContext.tsx        — Global toast notification system (success/error/info/warning)
    storage.ts             — Legacy localStorage (unused for core data, types reference)
  pages/
    AuthPage.tsx           — Google sign-in with galaxy theme
    HomePage.tsx           — Search bar, trending section, Firebase rooms, skeleton loading,
                             infinite scroll, online users strip, Hot/New/Following tabs
    RoomsPage.tsx          — Firebase room list, create room modal, real-time updates
    VoiceRoomPage.tsx      — 12-seat 4-column grid, raise hand, host controls panel,
                             room timer, room ID display, gift costs & coin deduction,
                             emoji reactions, floating effects, real-time Firebase chat
    ChatsPage.tsx          — Firebase real-time conversations, emoji picker (32 emojis),
                             image send, typing indicator with dots animation, unread badges
    ProfilePage.tsx        — Achievements modal (12 achievements), daily reward card with
                             streak tracking, transaction history, wallet/recharge, XP bar
    EditProfilePage.tsx    — Photo upload with progress bar, emoji avatar picker,
                             form validation, confetti success animation
```

### Key Features
- **Voice Rooms**: 12 seats in 4-column grid, speaking ring animation, host crown, raise hand
- **Host Controls**: Mute/kick/lock seats (host-only panel)
- **Gift System**: 12 gifts with costs (10-500 coins), sender pays, recipient gets 80%
- **Daily Rewards**: 50 base + streak bonus (up to +100), auto-claim on first login
- **Achievements**: 12 total (levels, coins, messages, streak, rooms, followers)
- **Real-time Chat**: Firebase-powered with typing indicators, image upload, auto-replies
- **Online Presence**: Firebase onDisconnect for live status tracking
- **Toast Notifications**: Global system for all user feedback
- **Page Transitions**: Fade/slide animations between pages
- **Skeleton Loading**: Shimmer placeholders for rooms, chats, etc.

### Firebase Config
- `apiKey`: `AIzaSyACJvjNecVmc-ooULC99pjlu6slWiQz_3o`
- `authDomain`: `chalotalk-67106.firebaseapp.com`
- `databaseURL`: `https://chalotalk-67106-default-rtdb.firebaseio.com`
- `projectId`: `chalotalk-67106`
- `storageBucket`: `chalotalk-67106.firebasestorage.app`

### Data Architecture (Firebase Realtime DB)
- `users/{uid}` — profile, coins, level, achievements, transactions, online status
- `rooms/{roomId}` — room config, 12 seats array, host info
- `roomMessages/{roomId}/{msgId}` — voice room chat messages
- `conversations/{convId}` — participant info, last message, unread counts, typing
- `messages/{convId}/{msgId}` — chat messages (text, emoji, image)
- `userConvs/{uid}/{convId}` — user's conversation index

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
