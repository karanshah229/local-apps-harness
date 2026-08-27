---
name: build-ios-release
description: Produce and verify an iOS Simulator build and locally signed IPA from a registered React Native Expo or Native iOS Swift app, including bundle identity, entitlements, signing, versioning, and optional TestFlight upload.
---

# Build the iOS release

1. Verify the registered bundle ID, entitlements, permission copy, icons, API environment, and release profile.
2. Test confirmed journeys in the iOS Simulator before signing.
3. Increment the build number only for a new distributable build; use local Xcode credentials and profiles.
4. Build the signed IPA locally (via EAS local profile or Xcode archive) and record path, version, checksum, and source checkpoint in the registry.
5. Ask for explicit approval immediately before uploading to TestFlight; verify App Store Connect processing afterward.

Complete when the local artifact is valid and simulator journeys pass; TestFlight is complete only after approved upload is processed.
