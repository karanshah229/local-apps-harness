---
name: build-android-release
description: Produce and verify an installable Android APK from a registered Expo app, including package identity, permissions, signing, versioning, device checks, and artifact tracking.
---

# Build the Android release

1. Verify the registered Android package, requested permissions, app icons, API environment, and release profile.
2. Increment the Android version code only for a new distributable build.
3. Build the APK with the repository's local Expo/EAS profile; keep signing material local and untracked.
4. Install on a representative device or emulator and run confirmed offline/network, permission, cold-start, and upgrade journeys as applicable.
5. Record artifact path, version, checksum, and source checkpoint in the registry.

Complete when the APK installs and confirmed journeys pass against the intended private API.
