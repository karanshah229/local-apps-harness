---
name: build-expo-mobile
description: Build or change shared Expo React Native behavior for Android and iOS, including NativeWind tokens, API environments, permissions, deep links, platform identity, and tests.
---

# Build the Expo mobile app

1. Confirm which requested behavior belongs on mobile; do not mirror unrelated web features.
2. Resolve the registered API, Android package, iOS bundle ID, permissions, and build profiles.
3. For visible UI work, read `../../references/ui-styling.md`; express that app-specific visual language through TypeScript, NativeWind, shared tokens, and platform-native components rather than browser shadcn components.
4. Keep local/private API configuration in environment files and handle device network reachability.
5. Test affected behavior on both Android and iOS when code is shared; update registry artifact metadata.

Complete when confirmed journeys pass on every affected platform.
