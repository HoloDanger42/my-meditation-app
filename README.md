# Zenith - Meditation & Wellness Companion

Zenith is a mobile application built with React Native and Expo, designed to be your personal companion for meditation, stress reduction, and improved focus. It provides a suite of tools to help you track your mental well-being, build healthy habits, and find moments of calm in your daily life.

## ✨ Features

- **Guided Meditations**: A library of meditation sessions to help you relax and focus.
- **Breathing Exercises**: Simple and effective breathing tools to manage stress.
- **Mood & Journal Tracking**: Log your mood and write journal entries to reflect on your day.
- **Personalized Statistics**: Visualize your progress with charts and stats for streaks, session time, and mood history.
- **Secure & Private**: User data is classified by sensitivity and stored securely on your device using `expo-secure-store`. Critical data requires biometric authentication.
- **Cloud Sync**: Optionally create an account to back up and synchronize your data across devices using Firebase.
- **Data Export**: Users can export their data at any time.

## 🛠️ Tech Stack

- **Framework**: React Native with Expo
- **Routing**: Expo Router (file-based)
- **State Management**: React Context
- **Storage**: `expo-secure-store` for on-device security and `@react-native-async-storage/async-storage` for non-sensitive data.
- **Backend & Sync**: Firebase (Authentication & Firestore)
- **UI & Components**: `react-native-gifted-charts` for data visualization.
- **Language**: TypeScript

## 🚀 Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- A development environment for Android (Android Studio) or iOS (Xcode).
- [Firebase Project](https://firebase.google.com/): You will need to set up a Firebase project to handle authentication and data synchronization.

### Setup

1.  **Clone the repository:**

    ```bash
    git clone
    cd my-meditation-app
    ```

2.  **Configure Firebase:**

    - Create a new Firebase project.
    - Set up an Android app in your Firebase project with the package name `com.holodanger.mymeditationapp`.
    - Download the `google-services.json` file and place it in the `config/` directory at the root of the project.

3.  **Install dependencies:**

    ```bash
    npm install
    ```

4.  **Run the application:**

    - **For Android:**
      ```bash
      npm run android
      ```
    - **For iOS:**
      ```bash
      npm run ios
      ```

### Helpful Scripts

- **Clean and Rebuild:** If you encounter build issues, this script cleans the project, reinstalls dependencies, and prepares the native projects.
  ```bash
  npm run reset-project
  ```
