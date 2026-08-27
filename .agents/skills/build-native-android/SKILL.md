---
name: build-native-android
description: Build or change native Android applications using Kotlin, Jetpack Compose, and Gradle when native Android platform capabilities are required.
---

# Build the Native Android application

1. Confirm that requested functionality strictly requires native Android capabilities (e.g. low-level OS APIs, custom Android background daemons/services, Android NDK/C++, direct hardware peripheral drivers); otherwise backtrack to `build-react-native-expo`.
2. Configure Android package identifier, Gradle build scripts, AndroidManifest.xml permissions, and target SDK versions.
3. Express UI using modern Jetpack Compose, Material Design 3 tokens, and coroutines for asynchronous flows.
4. Keep API base URLs in BuildConfig or build properties; never hardcode environment secrets.
5. Run unit tests (`./gradlew testDebugUnitTest`) and UI tests with Espresso/UI Automator or Maestro.

Complete when Android journeys pass and the native APK/AAB builds successfully.
