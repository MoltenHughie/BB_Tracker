* **Currently the “local-only” SQLite lives on the Node side** (`adapter-node` + `better-sqlite3` writing `./data/bb_tracker.sqlite`). That’s “local” to the machine running the server, not to an iPhone. ([GitHub][1])
* Your app logic heavily relies on **`+page.server.ts` load/actions** (calories/training/body/settings), and body photos are written with `node:fs` into `data/uploads/photos`. ([GitHub][2])

So the mobile port is very feasible, but it’s not a “wrap it and ship it” job unless you keep a server. Since you want **local-first + privacy**, the plan is: **turn the SvelteKit app into a client-only app inside a native shell, and swap the Node SQLite layer for a native iOS SQLite layer**.

Below is a concrete port plan tailored to your codebase.

---

## Concrete mobile port plan (local-first, no server)

### Phase 1 — Make the SvelteKit app run without a Node server

Right now you build a Node server (`adapter-node`) and execute DB code under `$lib/server/db`. ([GitHub][3])
For iOS you want a **static build + client-side routing**.

1. **Switch to a static/Spa build**

* Replace `@sveltejs/adapter-node` with `@sveltejs/adapter-static` and configure SvelteKit for client-only rendering (SPA mode).
* Add `export const ssr = false; export const prerender = true;` at the root layout level.

2. **Delete the “server boundary” in routes**
   You currently implement almost everything via `+page.server.ts` load + actions:

* `src/routes/calories/+page.server.ts` (add/update/delete entries, quick add food, copy previous day, etc.) ([GitHub][2])
* `src/routes/training/+page.server.ts` (templates, active workout, PR detection, previous performance, etc.) ([GitHub][4])
* `src/routes/body/+page.server.ts` (weights/measurements/composition/photos; photos written using `node:fs`) ([GitHub][5])
* `src/routes/settings/+page.server.ts` (stats + export/import backup using direct sqlite transaction) ([GitHub][6])

**Port pattern (repeat per module):**

* Move DB reads from `+page.server.ts` → `+page.ts` (client load).
* Replace SvelteKit “actions” with **client-side functions** (e.g. `caloriesService.addEntry()`) called from UI.
* Use `invalidateAll()` / local stores to refresh UI after mutations.

> Nice bonus: your UI code can stay almost identical—only the “submit form → server action” plumbing changes.

---

### Phase 2 — Replace better-sqlite3 with on-device SQLite (still using Drizzle)

For iOS you need a native SQLite bridge. The cleanest path right now is **Capacitor + a Capacitor SQLite plugin + Drizzle adapter**.

**Recommended stack**

* Capacitor wrapper for iOS ([Capacitor][7])
* `@capawesome-team/capacitor-sqlite` + Drizzle adapter `@capawesome/capacitor-sqlite-drizzle` (explicitly supports Drizzle + migrations + optional encryption) ([capawesome.io][8])

Why this is a good fit for your repo:

* You already use SQLite + Drizzle schema/migrations.
* This lets you keep your typed query code, just swapping the “driver”.

**DB implementation steps**

1. **Move schema to a shared location**

* Move `src/lib/server/db/schema.ts` → `src/lib/db/schema.ts`
* Create `src/lib/db/index.ts` that:

  * opens the database (e.g. `bb_tracker.sqlite`)
  * creates a Drizzle instance
  * runs migrations at app startup

2. **Migrations that work in Capacitor**
   Capawesome’s Drizzle adapter supports runtime migrations, and their guide explains how to generate a migrations bundle that works in non-Node environments. ([capawesome.io][9])
   Key points you’ll apply:

* Update `drizzle.config.ts` (or add a second config) so Drizzle Kit generates a **bundled migrations file** suitable for Capacitor (they note `driver: 'expo'` for that style of bundle). ([capawesome.io][9])
* Run `migrate()` on app launch; it’s idempotent (tracks applied migrations). ([capawesome.io][9])

3. **Seed data on first run**
   You currently seed via `tsx src/lib/server/db/seed.ts`. ([GitHub][1])
   On mobile, do:

* “if tables empty → run seed inserts” inside app startup after migrations.

4. **Optional: encrypt the database**
   If you later give this to other people, encryption becomes more relevant. Capawesome’s SQLite plugin supports SQLCipher-based encryption and recommends storing keys securely (not hardcoded). ([capawesome.io][10])

---

### Phase 3 — Replace photo storage (node:fs) with iOS filesystem storage

Your body photos currently:

* validate file type
* write to `data/uploads/photos` using `node:fs/promises`
* store filename in DB ([GitHub][5])

On iOS:

1. Use Capacitor’s Filesystem API to save image bytes into the app sandbox. ([Capacitor][11])
2. Store the saved file path (or a relative key) in SQLite.
3. When displaying images in the webview, use `Capacitor.convertFileSrc(...)` to turn the file path into something the webview can render. ([GitHub][12])

This removes the need for your `/api/photo`-style serving route entirely.

---

### Phase 4 — Add Capacitor (iOS app shell)

Once the app is static/client-only, wrapping is straightforward:

1. Add Capacitor to the repo and initialize iOS (Capacitor has an official Svelte guide). ([Capacitor][7])
2. Configure `webDir` to your static build output.
3. `npx cap add ios`, `npx cap sync ios`, open Xcode and run on device.

---

## What to do with your existing “API routes”

Your README mentions “API routes (food search, photo serving)”. ([GitHub][1])
In a no-server world:

* **OpenFoodFacts search**: call OpenFoodFacts directly from the client (or keep a tiny caching layer in SQLite if you want).
* **Photo serving**: disappears (files are local, loaded via `convertFileSrc`).

---

## Apple Watch integration plan (only for live training + rings)

Your desired watch scope is nicely narrow (live training only), which makes this sane.

### Principle: let watchOS run a workout session

Apple’s docs are very explicit that workout sessions are the “right lane”:

* A workout is saved using `HKWorkout`, and it ties into activity/rings behavior. ([Apple Developer][13])
* While a workout session runs on Apple Watch, the watch can automatically record active energy burned samples. ([Apple Developer][14])

### Concrete implementation approach

1. **Add a watchOS companion target** inside the Xcode project created by Capacitor.
2. Watch app runs an `HKWorkoutSession` using a strength-related activity type (e.g. “traditional strength training”).
3. Watch app UI: start/stop workout + show timer + calories + optional heart rate.
4. **Sync summary back to the phone** via WatchConnectivity (`WCSession`), which is the standard bridge for iPhone↔Watch data. ([Apple Developer][15])
5. iPhone receives the summary and writes it into your local SQLite DB as the “live training session metadata” (calories, minutes), while your existing workout sets/reps stay managed by the phone UI.

This keeps the watch focused on what it’s good at (sensors + rings) and keeps your Svelte UI as the source of truth for logging sets.

---

## Practical “order of operations” I’d actually follow on this repo

1. **Branch `mobile-port`**
2. Switch to **adapter-static + ssr=false** and get the UI running as a pure client app.
3. Introduce a **service layer**:

   * `src/lib/services/calories.ts`
   * `src/lib/services/training.ts`
   * `src/lib/services/body.ts`
   * `src/lib/services/settings.ts`
4. Replace each `+page.server.ts` with `+page.ts` + service calls.
5. Swap DB driver to **Capacitor SQLite + Drizzle adapter + runtime migrations**. ([capawesome.io][8])
6. Port photos to Filesystem + `convertFileSrc`. ([Capacitor][11])
7. Add Capacitor iOS shell and run on device. ([Capacitor][7])
8. Only after the iPhone app feels good: add the watch target + workout session + WatchConnectivity sync. ([Apple Developer][14])

---

If you follow that path, you end up with:

* **No server**
* **On-device SQLite**
* **Your existing Drizzle schema/query style preserved**
* A clean runway to **Watch workouts that close rings**, without dragging calories/progress views onto a 45mm postage stamp.

[1]: https://github.com/MoltenHughie/BB_Tracker "GitHub - MoltenHughie/BB_Tracker"
[2]: https://raw.githubusercontent.com/MoltenHughie/BB_Tracker/main/src/routes/calories/%2Bpage.server.ts "raw.githubusercontent.com"
[3]: https://raw.githubusercontent.com/MoltenHughie/BB_Tracker/main/svelte.config.js "raw.githubusercontent.com"
[4]: https://raw.githubusercontent.com/MoltenHughie/BB_Tracker/main/src/routes/training/%2Bpage.server.ts "raw.githubusercontent.com"
[5]: https://raw.githubusercontent.com/MoltenHughie/BB_Tracker/main/src/routes/body/%2Bpage.server.ts "raw.githubusercontent.com"
[6]: https://raw.githubusercontent.com/MoltenHughie/BB_Tracker/main/src/routes/settings/%2Bpage.server.ts "raw.githubusercontent.com"
[7]: https://capacitorjs.com/solution/svelte?utm_source=chatgpt.com "Using Capacitor with Svelte"
[8]: https://capawesome.io/plugins/sqlite/?utm_source=chatgpt.com "SQLite Plugin for Capacitor"
[9]: https://capawesome.io/blog/how-to-use-drizzle-orm-with-capacitor-and-sqlite/ "How to Use Drizzle ORM with Capacitor and SQLite - Capawesome"
[10]: https://capawesome.io/plugins/sqlite/ "SQLite Plugin for Capacitor - Capawesome"
[11]: https://capacitorjs.com/docs/apis/filesystem?utm_source=chatgpt.com "Filesystem Capacitor Plugin API | Capacitor Documentation"
[12]: https://github.com/ionic-team/capacitor/issues/1468?utm_source=chatgpt.com "Android/iOS: Show Image from Data directory · Issue #1468"
[13]: https://developer.apple.com/documentation/healthkit/workouts-and-activity-rings?utm_source=chatgpt.com "Workouts and activity rings | Apple Developer Documentation"
[14]: https://developer.apple.com/documentation/HealthKit/running-workout-sessions?utm_source=chatgpt.com "Running workout sessions | Apple Developer Documentation"
[15]: https://developer.apple.com/documentation/WatchConnectivity/transferring-data-with-watch-connectivity?utm_source=chatgpt.com "Transferring data with Watch Connectivity"
