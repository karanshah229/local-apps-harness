---
name: build-react-native-expo
description: Build or change shared React Native Expo mobile apps for Android and iOS, including NativeWind tokens, API environments, permissions, deep links, platform identity, and tests.
---

# Build the React Native Expo mobile app

1. Confirm which requested behavior belongs on mobile; do not mirror unrelated web features.
2. Verify that all requested functionality can be built without writing custom native Kotlin/Swift/C++ code; if custom native code is required, backtrack to `build-native-android` or `build-native-ios`.
3. Resolve the registered API, Android package, iOS bundle ID, permissions, and build profiles.
4. For visible UI work, read `../../references/ui-styling.md`; express that app-specific visual language through TypeScript, NativeWind, shared tokens, and platform-native components rather than browser shadcn components.
5. Keep local/private API configuration in environment files and handle device network reachability.
6. Test affected behavior on both Android and iOS when code is shared; update registry artifact metadata.

Complete when confirmed journeys pass on every affected platform.
