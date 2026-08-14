# Application Integration Checklist

Use this checklist when onboarding a new service or migrating existing code into this Turborepo monorepo.

## 1. Directory Structure
- [ ] Place frontend and backend components under `apps/` with descriptive names (e.g. `apps/new-app-client`, `apps/new-app-server`).
- [ ] Group non-app configurations, scripts, and deployment YAMLs under `infra/`.

## 2. Package Configuration
- [ ] Ensure `package.json` has a unique `"name"` field.
- [ ] Set `"private": true` for apps and packages that shouldn't be published.
- [ ] Link shared packages as workspace dependencies, e.g.:
  ```json
  "dependencies": {
    "@workspace/shared": "workspace:*"
  }
  ```

## 3. Tooling and Linting
- [ ] Extend root TypeScript configuration from `@workspace/tsconfig`.
- [ ] Configure ESLint to extend `@workspace/eslint-config`.

## 4. Run Scripts
- [ ] Add a `"build"` script that compiles the code.
- [ ] Add a `"dev"` script that runs the application in local watch mode.
- [ ] Ensure port numbers do not conflict with existing apps (e.g., Todo: `5005`, Sip: `4000`, Stock: `5001`).
