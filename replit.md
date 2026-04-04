# Galaxy Voice Chat

## Overview
A premium dark purple galaxy-themed, mobile-first voice chat web app built with React + Vite. Designed to look and feel exactly like a real mobile app (max-width 400px) similar to Chalotalk.

## Architecture
- **Monorepo**: pnpm workspace
- **Frontend**: `artifacts/galaxy-voice` — React + Vite + TypeScript
- **API**: `artifacts/api-server` — Express (separate service)
- **Voice**: Agora Web SDK (placeholder App ID — user must replace `YOUR_AGORA_APP_ID_HERE`)

## Feature Set

### Auth
- Login / Sign Up with email + password
- Auto-generates unique UID (format: `UID######` e.g. `UID483920`)
- Auto-login via localStorage session
- Logout from Profile page

### Home Screen
- Hot / New / Follow tabs with room cards
- Live room count badge
- Notification bell with unread count badge
- Leaderboard trophy button
- Coins bar + level badge

### Rooms Page
- List all voice rooms with live status
- Create Room modal (name + topic picker)
- Join Room button → opens VoiceRoom

### Voice Room (Main Feature)
- 3x3 seat grid (9 seats), each showing avatar, username, mic status
- Empty seat (+), Occupied (avatar + name), Locked (lock icon)
- Speaking animation (glowing ring pulse)
- **Mic on/off toggle** — must take a seat first
- **Host controls**: mute/unmute, kick from stage, lock/unlock seats
- **Raise hand system**: listeners can request to speak; host sees queue and can approve/reject
- Room chat with emoji picker and gift notifications
- Gift sending panel (8 gift types, coin deduction + XP gain)
- Gift animation overlay (floating emoji + particles)
- Listener count display

### Gifts & Coins System
- 8 gift tiers: Rose (10💰) → Unicorn (5000💰)
- Sending deducts sender's coins
- Receiver gets 70% value in coins + XP
- Gift animation overlay with floating emoji + sparkle particles
- Notifications generated on gift send

### Leaderboard
- Top Coins / Top Gifted tabs
- Visual podium for top 3
- Full ranked list for rest
- Daily Reward claim button (resets every 24h) — awards 100–200 coins + 50 XP

### Notifications Panel
- Follow / Message / Room Invite / Gift / Raise Hand types
- Unread count badge on home screen
- Mark all as read on close

### Profile (Full)
- Avatar picker (16 emoji avatars)
- Editable: nickname, bio, gender, birthday (auto-calculated age), location, relationship status
- Interests tag selector
- Auto-generated UID display with copy button
- Level + XP progress bar (10 levels)
- Coins display + Followers / Following / Gifts received stats
- Gift stats card (received / sent / coins)
- Dark mode toggle
- Logout

### Social System
- Follow / Unfollow users
- Followers and Following stored as arrays of user IDs
- Follow action generates a notification for the target

### Chats
- Conversation list with unread badges and online indicators
- Full chat screen with sent/received bubbles
- Emoji quick-send row
- Simulated auto-replies from other users
- Typing indicator animation

## Data Storage
All data stored in localStorage:
- `gv_users` — all user accounts
- `gv_current_user` — logged-in user ID
- `gv_rooms` — user-created rooms (fake rooms seeded separately)
- `gv_messages` — all chat messages
- `gv_conversations` — conversation metadata
- `gv_notifications` — notification history

## Key Files
```
artifacts/galaxy-voice/src/
  lib/
    storage.ts     — all data types, CRUD, business logic (gifts, follow, leaderboard, daily reward)
    context.tsx    — global app state (user, page, room, notifications, gift animation)
  pages/
    AuthPage.tsx
    HomePage.tsx
    RoomsPage.tsx
    VoiceRoomPage.tsx
    ProfilePage.tsx
    ChatsPage.tsx
    LeaderboardPage.tsx
  components/
    Stars.tsx
    BottomNav.tsx
    GiftAnimation.tsx
    NotificationsPanel.tsx
  App.tsx
  index.css
```

## Agora Integration
- App ID: `5a9957fd6a8047f48310fd0e5545d42c` (configured)
- `src/services/voiceService.ts` — full Agora RTC wrapper
  - joinVoiceRoom, leaveVoiceRoom, toggleMic
  - Volume indicator for speaking detection
  - syncVoiceState() pushes speaking status to Firestore
- Voice-only (no video), RTC mode, VP8 codec, null token (test mode)

## Firebase
- Auth: Google redirect, anonymous, phone OTP
- Firestore: users collection, notifications, follows, blocks, reports
- Realtime DB: configured
- Storage: initialized (avatar uploads — requires Blaze plan)
- Config hardcoded in `src/lib/firebase.ts`

## Profile System (Ultra Pro)
All in `src/pages/ProfilePage.tsx` + `src/services/`:

### profileService.ts
- listenProfile() — real-time Firestore onSnapshot
- updateUserProfile() — merge updates to users/{uid}
- uploadAvatar() — Firebase Storage upload with graceful fallback
- deleteAccount() — GDPR/CCPA: deletes Firestore doc + notifications
- setUserOnline/Offline() — presence system
- toggleProfileVisibility() — public/private toggle
- getVIPTier() — Bronze/Silver/Gold/Platinum/Galactic based on level+coins
- getAchievements() — 8 achievement medals based on user stats
- getAgencyStats() — host dashboard data (live hours, salary, rank)

### followService.ts
- followUser() — updates both users' arrays + sends notification
- unfollowUser() — cleans up arrays
- isFollowing() — real-time check
- blockUser() / unblockUser() / isBlocked()
- reportUser() — saves to reports collection

### ProfilePage.tsx features
- Real-time Firestore sync (onSnapshot)
- VIP avatar frame with tier-specific glow colors
- Verified badge (blue ✓) for level 5+ or 50+ gifts
- Online/offline indicator + last seen timestamp
- XP progress bar with VIP color
- Stats: followers, following, gifts, coins
- Follow/Unfollow for other user profiles
- 4 tabs: Profile | Wallet | Agency | Settings
  - Profile: CP partner slot, bio, 8 achievements, level detail stats
  - Wallet: coin balance, gift history, backpack, store (locked/unlocked)
  - Agency: agency badge, live hours progress, salary progress, performance
  - Settings: privacy toggle, account info, delete account (GDPR)
- Edit mode: name, bio, avatar upload
- Report sheet with reason selection
- Block confirmation modal
- Delete account confirmation modal

## Design System
- Background: `#1A0F2E → #0F0F1A` gradient
- Accent: `#6C5CE7` / `#A29BFE`
- Gold: `#fdcb6e`
- Rounded: 14–20px border-radius
- Glow effects via `box-shadow`
- Star twinkling + gradient orb background animation
- Speaking pulse animation on active seats
