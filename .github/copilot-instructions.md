## FinanceApp — Copilot instructions (concise)

This file gives an AI coding agent the minimal, actionable knowledge to be productive in this repo.

- Tech stack: Expo (React Native) + TypeScript. Entry: `index.ts` -> `App.tsx`.
- Core runtime: `expo`; builds use `eas build` (recommended) or local Gradle (`android/gradlew.bat`).

Key files to inspect before editing
- `App.tsx` — app entry, forces RTL (I18nManager) and calls `DatabaseService.init()` and `NotificationService.init()`.
- `src/services/database.ts` — single-source of truth for DB schema and access patterns. All tables are created here; booleans are stored as `0/1` and dates as ISO strings.
- `src/services/notifications.ts` — scheduling, channels (Android), default reminder logic (3 days, 9:00). Use this when adding reminders or notifications.
- `src/models/types.ts` — canonical TypeScript shapes (Installment, Debt, Credit, Check, Reminder). Keep DB and types in sync.
- `src/utils/helpers.ts` — Persian date helpers and `generateMonthlySchedule` (used by DB to create installment payments).
- `app.json` — permissions and EAS project id (look here before build changes).

Architecture & patterns (why things are organized this way)
- Singletons: services export single instances (e.g. `export default new DatabaseService()`); call `init()` in `App.tsx` on startup. Always await `init()` before using services.
- Local-only design: all data is stored locally (Expo SQLite). There is intentionally no remote API.
- Persian / RTL-first: dates use `moment-jalaali` and UI is forced to RTL in native builds. Date handling uses ISO in DB + jalaali conversions in `utils`.
- Database schema lives in `database.ts` (createTables). When adding fields, update both `types.ts` and `createTables`, and add migration logic (no migrations present).

Build / run & debug (concrete commands)
- Install: `npm install` (or `yarn`).
- Dev with Expo: `npm start` (scan QR with Expo Go) or `npm run android` to run on Android device/emulator.
- EAS (recommended release): `eas build --platform android --profile preview` (see `app.json` extra.eas.projectId`).
- Local APK: `npx expo prebuild --platform android --clean` then open `android\gradlew.bat assembleRelease` (Windows).
- Windows helper scripts exist: `build-apk.bat`, `BUILD-*.bat` — inspect them to reproduce local steps.
- Debug logs: use `expo start --tunnel` / `adb logcat` or Android Studio logcat for native crashes.

Important implementation notes (examples)
- Database booleans: DB columns like `isPaid` use INTEGER 0/1. Service methods convert to/from `boolean` (see `getInstallments()` and mapping logic).
- Installments: `addInstallment()` inserts a row into `installments` and then calls `generateMonthlySchedule()` to populate `installment_payments` rows — keep both steps consistent when changing installment behavior.
- Notifications: default reminders scheduled 3 days before due date at 09:00. If you change scheduling logic, update both `notifications.ts` and any UI controls that let users change reminder days.
- Dates: store as ISO strings in DB; convert to Persian/Jalaali only for display using helpers.

Conventions & gotchas
- TypeScript strict mode is enabled (`tsconfig.json` extends `expo/tsconfig.base` with `strict: true`). Keep types in `src/models/types.ts` accurate.
- No server code: every change must assume offline-only behavior and local persistence constraints.
- Schema changes are manual: there's no automated migration system. For non-trivial schema edits, add migration steps or clear DB in dev.
- RTL is enforced in `App.tsx` and is skipped on web (Platform check). Be careful when running in web mode — layout may differ.

If you need to modify DB schema
1. Update `src/models/types.ts` types.
2. Update `createTables()` in `src/services/database.ts` (keep existing columns and types consistent).
3. Add a short migration plan in a new helper (or clear DB during dev). Mention the change in the PR description.

PR / commit tips for humans
- When changing reminders or alarm behavior, note that `app.json` requests `NOTIFICATIONS` and `SCHEDULE_EXACT_ALARM` permissions for Android.
- Mention EAS project id and whether new native permissions or manifest edits are required.

When uncertain, check these first: `App.tsx`, `src/services/database.ts`, `src/services/notifications.ts`, `src/models/types.ts`, `src/utils/helpers.ts`, `app.json`.

If anything here is unclear or you want more examples (e.g., sample DB row transforms, a migration template, or common PR checklists), tell me what section to expand.
