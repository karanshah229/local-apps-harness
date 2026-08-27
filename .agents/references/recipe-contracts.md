# Preferred recipe contracts and composable stacks

Read when creating an application, selecting a technology stack, or reviewing a stack exception.

## Stack Selection Rules

1. **Desktop Software (macOS, Windows, Linux, Web)**:
   - Use `tauri-desktop` as the preferred stack for desktop software and cross-platform desktop/web delivery.
   - *Not preferred for mobile targets.*

2. **Mobile Development (Android & iOS)**:
   - Use `react-native-expo` as the preferred stack for cross-platform mobile development (Android and iOS) whenever requested features can be built without writing custom native Kotlin/Swift/C++ code.

3. **Native Android (Kotlin)**:
   - Use `native-android-kotlin` when a functionality mentioned by the user is achievable **only** by building a native Android app (e.g. low-level OS APIs, custom Android background daemons/services, Android NDK/C++, direct hardware peripheral drivers).

4. **Native iOS (Swift)**:
   - Use `native-ios-swift` when a functionality mentioned by the user is achievable **only** by building a native iOS app (e.g. Metal shaders, Apple Watch/Dynamic Island/Widget extensions, App Clips, Apple-exclusive framework integrations).

5. **Web Browser Only**:
   - Use `react-web` when the browser experience needs no server-side data or behavior.

6. **Full-Stack Web (SQLite vs PostgreSQL)**:
   - Use `full-stack-sqlite` for server-side behavior that runs as a single instance, expects modest write concurrency, keeps data on its local private volume, and uses verified file-level backup.
   - Use `full-stack-postgresql` when confirmed behavior or scale requires multiple application instances, sustained concurrent writes, shared database access across services, replication, or point-in-time restore. When using PostgreSQL, apps must reuse the shared `postgres` service (`workspace-postgres`) in `infra/docker-compose.yml`.

7. **Multi-Stack / Hybrid Combinations**:
   - Any combination of any of the stacks is possible (e.g. React Native for mobile + Tauri for desktop; Tauri + Fastify/PostgreSQL; React Web + Native Android + Native iOS + Fastify API).
   - Stack choice must be based solely on user requirements. If there is ambiguity or uncertainty, ask clarifying questions before deciding.

---

## Technology Piece Guidelines

| Technology Piece | When to Use | When NOT to Use |
| :--- | :--- | :--- |
| **React (Web)** | Browser-based applications accessible via URL over local network / Tailscale. | Offline-first native desktop software or mobile-native hardware integrations. |
| **Tauri (Desktop)** | Preferred stack for desktop software (macOS, Windows, Linux, Web). Offers lightweight footprint, native windowing, system tray, local filesystem access, and native performance. | Mobile targets (not preferred for mobile). For mobile, use React Native (Expo) or Native Kotlin/Swift. |
| **React Native (Expo)** | Preferred stack for mobile development (Android & iOS) whenever requested features can be built without writing custom native Kotlin/Swift/C++ code. | Apps strictly requiring deep OS-level background hooks, specialized platform APIs, or custom native SDKs without Expo bindings. |
| **Native Android (Kotlin)** | Functionality is achievable **only** by building a native Android app (e.g. low-level OS services, custom background daemons, Android NDK/C++, custom hardware peripherals). | Standard cross-platform mobile apps where standard UI and network syncing suffice. |
| **Native iOS (Swift)** | Functionality is achievable **only** by building a native iOS app (e.g. Metal shaders, Apple Watch / Dynamic Island / Widget extensions, App Clips, Apple-exclusive frameworks). | Standard cross-platform mobile apps where standard UI and network syncing suffice. |
| **Fastify (API)** | Multi-client data synchronization (e.g. Web + Desktop + Mobile), central business logic, background jobs, server-side secret management. | Standalone local-first desktop or mobile utility operating entirely on-device with local storage. |
| **SQLite (Database)** | Single-instance applications, modest write concurrency, embedded local storage on desktop/mobile, verified filesystem backup. | High-concurrency multi-user concurrent writes, multi-instance microservices, or distributed multi-node syncing. |
| **PostgreSQL (Database)** | High-concurrency writes, multi-instance horizontal scaling, shared relational data across multiple services, point-in-time recovery. | Standalone desktop tools where spinning up a separate PostgreSQL container creates unnecessary overhead. |

---

## Holistic Compatibility & Backtracking Protocol

Even if individual technologies make sense in isolation, their combination must form a sound, operable architecture. The AI must evaluate the system combination and backtrack if an invalid pairing is identified:

1. **Direct Mobile-to-Database Connection**: Mobile apps (React Native, Native Android, Native iOS) cannot connect directly over raw TCP to a remote database (Postgres or SQLite). If mobile client + remote DB is requested, the AI **must** introduce a Fastify API layer.
2. **Tauri on Mobile**: If mobile is requested, Tauri is not preferred; backtrack to React Native (Expo) or Native Kotlin/Swift.
3. **Redundant Dual-Native**: Selecting both Native Android (Kotlin) AND Native iOS (Swift) for an app that lacks platform-exclusive requirements is an anti-pattern. Backtrack to React Native (Expo) for unified velocity unless explicit platform-exclusive features are required on both.
4. **Distributed SQLite without Sync**: Using local SQLite across multiple distinct client devices without a centralized API/database for synchronization will cause data silo fragmentation. Backtrack to Fastify + PostgreSQL (or centralized Fastify + SQLite).

---

## Product Ambiguity & Clarification Protocol

When user requirements are incomplete or ambiguous, do not ask technical questions about databases or frameworks. Ask plain-language questions about outcomes:

1. **Access & Target Devices**:
   - *"Where will you and your team primarily use this app? (On desktop computers [Mac/Windows], on smartphones [iPhone/Android], or in a web browser?)"*
2. **Data Sharing & Multi-User**:
   - *"Will information need to be synced across multiple devices in real-time, or will each person use it independently on their own device?"*
3. **Special Device / OS Features**:
   - *"Does the app require specialized hardware features (such as continuous background tracking, offline USB/device control, or Apple-specific features) or standard screens and data entry?"*

Translate the user's responses into the optimal layer combination.

---

## Stack Exceptions

Use another stack only for a concrete unmet requirement. Record the evidence, rejected preferred-stack approach, maintenance cost, and how the exception implements the common health, environment, container, test, backup, deployment, and rollback contract. Complete the review only after its recipe exists under `templates/` and passes repository validation.
