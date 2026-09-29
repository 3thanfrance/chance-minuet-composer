<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting published git history.
<!-- LOVABLE:END -->

- Keep the historical Mozart dataset bundled in `src/data/mozart.ts`; runtime network access must never be required for music.
- Use IDs 1–176 only; source ID 177 is an auxiliary ending outside this 16-bar single-pass experience.
- The lookup table follows the independently verified Princeton matrix, including total 4 / position 10 = 139.
- Generate every choice from two independent d6 values; never sample totals uniformly.
- Keep audio browser-native and client-only so playback remains private, immediate, and deployment-safe.
- Share links use strict fixed-width v2 base-13 totals and only valid links may bypass the introduction.
