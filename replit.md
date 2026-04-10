# Galaxy Voice Chat

## Overview
Galaxy Voice Chat is a dual-platform project comprising `Galaxy Mobile` (React Native/Expo) and `Galaxy Web` (React/Vite). Both applications share a single Firebase project (`chalotalk-67106`). The project aims to provide a rich, interactive voice chat experience with a strong emphasis on real-time communication, social features, and a distinctive visual design.

**Key Capabilities:**
- Real-time voice chat powered by Agora RTC.
- Comprehensive social features including user profiles, following, friend requests, "Moments" grid feed, and "Explore" vertical feed with video auto-play.
- Advanced chat functionalities with typing indicators, image/voice messages, and reactions.
- Dynamic gift system with leaderboards and animated presentations.
- Robust user management with multi-auth options, a unique 9-digit user ID system, and administrative controls.
- Theming: "Midnight Nebula" for mobile and "Dark Galaxy" for web.

## User Preferences
I prefer iterative development with a focus on delivering working features incrementally. Please ask before making any major architectural changes or introducing new external dependencies. I value clear and concise explanations, avoiding jargon where possible. I expect the agent to be proactive in identifying potential issues and suggesting improvements, especially regarding performance and user experience.

## System Architecture

### UI/UX Decisions
- **Galaxy Web Theme**: Dark galaxy theme with purple/teal glowing borders, glassmorphism elements, and specific animations (giftFly, logoGlow, speaking-ring, confetti, etc.).
- **Galaxy Mobile Theme**: "Midnight Nebula" with dark gradients (`#050112 → #0e0520 → #1a0b2e`).
- **Color Palette**: Primary accents in purple (`#6C5CE7`, `#A29BFE`), gold for VIP/host elements (`#FFD700`), and live green (`#00e676`).
- **Typography**: Inter font.
- **Interactive Elements**: Button animations (scale+ripple), card hover/press states, skeleton shimmer for loading states, page transitions.
- **Voice Room Layout**: Dedicated classes for room containers, seat grids, chat sections, and bottom control bars.
- **Anti-Screenshot Protection**: Implemented via CSS on sensitive pages (Profile, Voice Room).

### Technical Implementations
- **Frameworks**: React + Vite + TypeScript for Web, React Native (Expo) for Mobile.
- **State Management**: Firebase Realtime Database for all core data, ensuring real-time synchronization across clients.
- **Authentication**: Firebase Email/Password, Google Auth, Phone OTP (demo), and Guest (anonymous) login.
- **Voice Communication**: Agora Web SDK (`agora-rtc-sdk-ng`) for Galaxy Web, `react-native-agora` for Galaxy Mobile, featuring AEC (echo cancellation), ANS (noise suppression), and AGC (automatic gain control).
- **User Management**:
    - Unique 9-digit `userId` generated and reserved atomically via Firebase transactions.
    - Online presence tracking using Firebase `onDisconnect`.
    - Comprehensive user profiles including coins, level, achievements, transactions, blocked users, friends, friend requests, and privacy settings.
    - Mutual follow OR friendship system to gate chat access (friends can chat without gift).
    - Super Admin system with specific user IDs.
- **Room Management**:
    - 12-seat grid (4x3) with host and co-host roles.
    - Real-time room listeners, seat management, and room messages.
    - Host controls for muting, kicking, locking seats, and setting co-hosts.
    - Enter permissions (Everyone/Invite Only) and mic seat limits.
- **Chat System**:
    - Real-time conversations with typing indicators.
    - Support for text, emoji, image, and voice messages.
    - Seen/delivered message statuses.
    - Double-tap chat reactions.
    - Media uploads via Cloudinary (images auto-optimized with `w_400,h_400,c_fill,q_auto,f_auto` transformations).
- **Gift System**:
    - Animated gift sending with coin deduction.
    - Daily/weekly/monthly gift leaderboards.
    - Gift history tracking.
- **Notification System**: In-app notifications for various events (follows, gifts, friend requests, messages, room invites, system alerts).
- **Daily Rewards & Achievements**: System for rewarding user engagement and progress.
- **Support System**: Integrated feedback form and help center articles.
- **Toast Notifications**: Global system for user feedback (success/error/info/warning).

### System Design Choices
- **Data Persistence**: Firebase Realtime Database for core data; Cloudinary for all image/media uploads (Cloud Name: `dz1bhfpkc`, Upload Preset: `profile_pics`). No reliance on `localStorage` for core data.
- **Modular Services**: Codebase organized into distinct service modules (e.g., `userService`, `roomService`, `chatService`, `voiceService`) for maintainability and separation of concerns.
- **Real-time Focus**: Extensive use of Firebase real-time listeners for dynamic UI updates across all features.
- **Security**: Firebase App Check with reCAPTCHA Enterprise, user blocking, reporting system, and permission enforcement for room actions.

## External Dependencies

- **Firebase**:
    - **Project ID**: `chalotalk-67106`
    - **Services**: Realtime Database, Authentication.
- **Agora.io**:
    - **App ID**: `5a9957fd6a8047f48310fd0e5345d42c` (Web), `5a9957fd6a8047f48310fd0e5545d42c` (Mobile)
    - **SDKs**: `agora-rtc-sdk-ng` (Web), `react-native-agora` (Mobile)
- **React/Vite**: For Galaxy Web frontend development.
- **React Native/Expo**: For Galaxy Mobile frontend development.
- **Expo Libraries**: `expo-router`, `expo-linear-gradient`, `react-native-reanimated`.