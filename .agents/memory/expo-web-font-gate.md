---
name: Expo web font gate
description: Avoid blank web previews while preserving native font loading.
---

In this workspace's Expo setup, a root-level `return null` while `useFonts` is pending can leave the server-rendered browser preview empty even though Metro is running. Allow web to render with system fallback fonts while retaining the native splash/font gate.

**Why:** The preview appeared blank with no browser exception; the HTML root was empty until the web branch could render.

**How to apply:** If an Expo browser preview is blank while its workflow is healthy, inspect the root font gate and server-rendered HTML before treating it as a Metro or routing failure.
