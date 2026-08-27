---
name: build-native-ios
description: Build or change native iOS applications using Swift, SwiftUI, and Xcode when native iOS platform capabilities are required.
---

# Build the Native iOS application

1. Confirm that requested functionality strictly requires native iOS capabilities (e.g. Metal shaders, Apple Watch/Dynamic Island/Widget extensions, App Clips, Apple-exclusive framework integrations); otherwise backtrack to `build-react-native-expo`.
2. Configure iOS bundle identifier, entitlements, Info.plist permission strings, and minimum deployment target.
3. Express UI using modern SwiftUI, SF Symbols, and standard Apple HIG tokens.
4. Keep API base URLs in build configurations or Info.plist variables; never commit private keys.
5. Run unit tests and UI tests with XCTest and XCUITest on iOS Simulator or connected devices.

Complete when iOS journeys pass and the Xcode project builds successfully.
