# Galaxy Voice Chat — React Native Mobile App

## Overview
A premium mobile voice chat application built with React Native (Expo) following a "Midnight Nebula" dark galaxy design system. The app allows users to join live voice rooms, manage profiles, chat via DMs, browse moments, and host real-time voice sessions powered by Agora RTC.

## Architecture
- **Type**: Expo React Native mobile app (Expo Go compatible, native build for Agora voice)
- **Package name**: `com.sachin.galaxyvoicechat`
- **Location**: `artifacts/galaxy-mobile/`
- **Backend**: Firebase (project: `chalotalk-67106`) via `EXPO_PUBLIC_FIREBASE_*` env vars
- **Voice**: Agora RTC via `react-native-agora` (graceful fallback in Expo Go)
- **Agora App ID**: `5a9957fd6a8047f48310fd0e5545d42c` (via `EXPO_PUBLIC_AGORA_APP_ID`)

## App Structure
```
artifacts/galaxy-mobile/
  app/
    _layout.tsx              — Root Stack (tabs + room/[id] modal)
    (tabs)/
      _layout.tsx            — Tab navigator (Home, Rooms, Chats, Moment, Mine)
      index.tsx              — Home screen: featured rooms, category filters
      rooms.tsx              — Room list: live rooms, join navigation
      chats.tsx              — DM conversations
      moment.tsx             — Social feed / moments
      mine.tsx               — Profile + VIP + Agency tabs
    room/
      [id].tsx               — Full-screen voice room (Agora + circular seats)
  components/
    GlassCard.tsx            — Glassmorphism card container
    AvatarFrame.tsx          — Animated glow avatar with level badge
    LevelBar.tsx             — XP progress bar
    MedalWall.tsx            — Medal wall component
    StatsRow.tsx             — Followers/Following/Visitors stats
    AgencyCard.tsx           — Agency summary card
    AgencyDashboard.tsx      — Agency performance dashboard
    ErrorBoundary.tsx
  lib/
    roomData.ts              — Room & RoomSeat types, ROOMS list, getMockSeats()
    firebase.ts              — Firebase init (reads EXPO_PUBLIC_FIREBASE_* vars)
    profileData.ts           — Profile & medal data
  services/
    agoraService.ts          — Agora RTC wrapper (graceful fallback in Expo Go)
  constants/
    colors.ts                — Midnight Nebula design tokens
  hooks/
    useColors.ts             — Dark/light color scheme hook
```

## Voice Room Feature
- Full-screen immersive layout with LinearGradient background
- **Host seat** at center (80px) with gold crown + golden glow ring
- **8 speaker seats** in a circular ring using sin/cos positioning
- **Speaking animation**: dual pulsing rings (inner fast + outer slow) — green for speakers, gold for host
- **Muted badge**: red mic-off indicator on each muted seat
- Empty seats show dashed border with `+` icon (tap to request)
- Occupied seats show name label below avatar emoji
- Agora joins channel on mount, leaves on back-navigation
- Mic toggle with haptic feedback + animated scale bounce
- Listeners section with scrollable emoji avatars + overflow count
- Settings / Mic / Leave control bar pinned to bottom

## Design System (Midnight Nebula)
- **Background**: `#050112 → #0e0520 → #1a0b2e` (LinearGradient)
- **Primary accent**: `#6C5CE7` / `#A29BFE`
- **Gold**: `#FFD700` (host elements)
- **Live green**: `#00e676`
- **Glass cards**: `rgba(255,255,255,0.03)` bg + white border at 5% opacity
- **Nebula orbs**: large blurred circles at rgba purple tints
- **Seat glow**: shadowColor with 10px shadowRadius on occupied seats

## Firebase Configuration
All vars set as `EXPO_PUBLIC_FIREBASE_*` in the shared environment:
- `EXPO_PUBLIC_FIREBASE_API_KEY` = `AIzaSyACjvjNecVmc-ooULC99pjlu6slWiQz_3o`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID` = `chalotalk-67106`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` = `chalotalk-67106.appspot.com`
- `EXPO_PUBLIC_AGORA_APP_ID` = `5a9957fd6a8047f48310fd0e5545d42c`

## Enabling Real Agora Voice
Agora requires a native build. To enable real voice:
```bash
pnpm --filter @workspace/galaxy-mobile add react-native-agora
npx expo prebuild
npx expo run:ios   # or run:android
```
The UI works fully in Expo Go with UI demo mode (no audio).

## Key Dependencies
- `expo` ~54.0.27, `expo-router` ~6.0.17
- `expo-linear-gradient`, `react-native-svg`, `react-native-reanimated` ~4.1.1
- `@expo/vector-icons`, `expo-haptics`, `expo-blur`
- `react-native-safe-area-context`, `react-native-gesture-handler`
