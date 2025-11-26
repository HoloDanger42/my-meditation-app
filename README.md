# Zenith – Meditation & Wellness Companion

Zenith is a React Native + Expo application that helps users build sustainable meditation and stress‑management habits. It combines guided content, mood tracking, journaling, breathing tools, and secure analytics-backed insights — all with optional encrypted cloud sync.

## Table of Contents
1. [Features](#-features)
2. [Tech Stack](#-tech-stack)
3. [Architecture Overview](#-architecture-overview)
4. [Data Security & Privacy](#-data-security--privacy)
5. [Setup & Development](#-setup--development)
6. [Environment & Secrets](#-environment--secrets)
7. [Scripts](#-scripts)
8. [Building with EAS](#-building-with-eas)
9. [Troubleshooting](#-troubleshooting)
10. [Data Migration](#-data-migration)
11. [Contributing](#-contributing)

## ✨ Features

- **Guided Meditations**: Structured session data sourced from `data/meditationsData.ts`.
- **Breathing Tools**: Interactive timed breathing and history (`tools/breathing*.tsx`).
- **Mood Tracking**: Quick mood logging & historical view (`mood/`).
- **Journal**: Secure personal entries with create/view flows (`journal/`).
- **Statistics Dashboard**: Streaks, aggregated durations, mood trends via `react-native-gifted-charts`.
- **Onboarding Flow**: First‑launch detection routes users to a welcome experience.
- **Secure Local Storage**: Sensitivity‑classified data uses `expo-secure-store`; lower sensitivity uses `@react-native-async-storage/async-storage`.
- **Encrypted Cloud Sync (Optional)**: Firebase Auth + Firestore with per‑user AES‑256 encryption fallback to a lightweight XOR scheme (see `utils/firestoreSync.ts`).
- **Automatic Data Migrations**: Runs at startup via `runDataMigrationIfNeeded`.
- **Dark / Light Theme**: Theme context with adaptive status bar.
- **Biometric Gate (Planned)**: Hooks in place for secure unlocking (see usage of Secure Store & notifications settings).

## 🛠️ Tech Stack

- **Expo SDK**: 53 (`expo@^53.0.22`)
- **React / React Native**: React 19 + React Native 0.79.x (bleeding‑edge; may surface ecosystem warnings)
- **Navigation**: `expo-router` file system routing
- **Firebase**: Modular RN Firebase packages for Auth & Firestore
- **Storage**: `expo-secure-store`, `@react-native-async-storage/async-storage`
- **Charts & Visualization**: `react-native-gifted-charts`
- **Animations & Gestures**: `react-native-reanimated`, `react-native-gesture-handler`
- **Language**: TypeScript

> Note: Using React 19 with Expo SDK 53 is forward‑leaning; if instability arises, consider downgrading to stable React/React Native versions suggested by `npx expo-doctor`.

## 🧱 Architecture Overview

- **Entry Point**: `app/_layout.tsx` sets up Auth & Theme providers, splash handling, first‑launch logic, and initial sync trigger.
- **Routing**: Folder structure under `app/` maps directly to routes (Expo Router). Grouped routes `(auth)` and `(other)` are hidden from the tab bar.
- **Context**: `context/AuthContext.tsx` & `context/ThemeContext.tsx` supply user/session and theming state.
- **Sync Layer**: `utils/firestoreSync.ts` encrypts and syncs user documents in the `user_data` Firestore collection.
- **Data Classification**: Secure vs non-secure storage abstractions funnel through a sync provider registration model.
- **Migrations**: `runDataMigrationIfNeeded` ensures legacy formats are upgraded before normal usage.
- **Scripts Automation**: Post‑prebuild modifications handled by `scripts/post-prebuild.js` (e.g., adjusting native config after `expo prebuild`).

## 🔐 Data Security & Privacy

Firestore sync uses a hybrid approach:
- **AES‑256‑CBC Encryption**: Native path via `react-native-aes-crypto` with PBKDF2 (10k iterations, SHA‑256) and per‑user key derivation (UID + salt).
- **Fallback Simple Encryption**: Lightweight XOR + Base64 when native crypto isn’t available (e.g. Expo Go constraints).
- **Plaintext Marking**: If all encryption fails, data stored with `plain:` prefix for graceful degradation.
- **Prefixes**: `aes:`, `simple:`, `plain:` identify storage format.

This design aims for defense‑in‑depth while maintaining operability on constrained runtimes. Do **not** treat fallback encryption as robust security; it is best‑effort obfuscation. For full security guarantees, ship production builds (not Expo Go) and avoid storing highly sensitive data remotely.

## 🚀 Setup & Development

### Prerequisites
- Node.js LTS (>= 20 recommended)
- Android Studio (for device/emulator) and/or Xcode (for iOS)
- Firebase project with Authentication + Firestore enabled

### Clone & Install
```bash
git clone <your-repo-url>
cd my-meditation-app
npm install
```

Run in development:
```bash
npm start            # Expo dev server
npm run android      # Build & run native Android
npm run ios          # Build & run native iOS (macOS only)
```

After native runs (`run:android` / `run:ios`), the `post-prebuild` script applies adjustments automatically.

## 🧪 Environment & Secrets

`eas.json` expects a secret named `GOOGLE_SERVICES_JSON` containing the raw contents of your `google-services.json`. Set it via:
```bash
eas secret:create --name GOOGLE_SERVICES_JSON --value "$(cat config/google-services.json)" --type string
```

During builds, the prebuild command writes this to `android/app/google-services.json`.

## 📜 Scripts

| Script | Purpose |
|--------|---------|
| `npm start` | Start Expo dev server |
| `npm run android` / `ios` | Native build & run + post-prebuild adjustments |
| `npm run prebuild` | Generate native projects (managed → bare transition) |
| `npm run reset-project` | Clean caches + reinstall + post-prebuild fix |
| `npm run fix-reanimated` | Patch potential Reanimated linking issues |
| `npm test` | Runs Jest with Expo preset |
| `npm run lint` | Lints project via Expo tooling |

## 🏗️ Building with EAS

Trigger builds:
```bash
eas build --platform android
eas build --platform ios
```
Recommended for dependency or Gradle cache issues:
```bash
eas build --platform android --clear-cache
```

### Aligning Dependencies
Use Expo’s installer for version alignment:
```bash
npx expo install expo-router react-native-safe-area-context react-native-screens
npx expo-doctor
```
Apply suggested fixes and commit the updated `package-lock.json`.

## 🔧 Troubleshooting

| Issue | Symptom | Fix |
|-------|---------|-----|
| Lockfile mismatch | `npm ci` fails (`EUSAGE`) | Run `npm install`, commit updated `package-lock.json` |
| Missing module `:expo-json-utils` | Gradle error referencing `expo-manifests` | `npx expo install expo-json-utils` then clean build |
| SoftwareComponent `release` not found | Gradle config failure | Clear caches, ensure all Expo SDK 53 peer deps installed |
| Reanimated errors | Red screen / gesture failures | Run `npm run fix-reanimated` after prebuild |
| Crypto unavailable in Expo Go | Fallback to `simple:` prefix | Use a production build for full AES encryption |

General clean sweep:
```bash
rmdir /s /q node_modules
del package-lock.json
npm cache clean --force
npm install
npx expo-doctor
```

## 🔄 Data Migration
`runDataMigrationIfNeeded` executes early in `_layout.tsx` to upgrade legacy storage formats. To add a new migration:
1. Create a migration routine under `utils/migrationUtils.ts`.
2. Register it in the migration dispatcher maintaining idempotency.
3. Bump an internal version marker so the routine only runs once.

## 🤝 Contributing
1. Fork & branch: `git checkout -b feature/<name>`
2. Keep changes focused; run `npm test` and `npx expo-doctor`.
3. Submit PR with a summary describing storage/encryption impact if applicable.

## 📄 License
Not yet specified. If you intend to open source, add a LICENSE file (MIT recommended) and reference it here.

## ✅ Roadmap (High‑Level)
- Add biometric gate around sensitive journal/mood data
- Expand meditation catalog & personalization engine
- Add offline‑first sync conflict resolution
- Improve encryption key rotation strategy
- Introduce push notification reminders / streak motivators

---
If you encounter an issue not covered above, open one with logs from the failing build phase (Gradle or Metro output). Happy calming! 🧘‍♂️
