---
name: understand-product-request
description: Convert a non-technical product request into bounded behavior, target platform clarity, and acceptance examples. Use for new apps, features, ambiguous changes, or whenever common features might otherwise be assumed.
---

# Understand the product request

1. Identify the product outcome and target app without asking technical questions.
2. If the request is ambiguous regarding device access, multi-user synchronization, or special hardware features, ask plain-language outcome questions:
   - *Target devices*: Where will you and your team use this app? (Desktop Mac/Windows, mobile smartphones, web browser?)
   - *Data sharing*: Will data need to sync in real time across multiple users/devices, or be stored locally on one device?
   - *Special features*: Does the app require special device hardware capabilities (like continuous background tracking or offline peripheral control) or standard screens?
3. Record requested, confirmed, excluded, and unresolved behavior. Treat every visible capability absent from requested/confirmed as excluded for this task.
4. Separate product behavior from required technical completeness such as validation, tests, health, migrations, containers, routes, and backups.
5. Write checkable acceptance examples from the user's perspective.

Complete when every visible behavior and platform target has a request or confirmation and the builder can implement without inventing product decisions.
