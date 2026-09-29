# A Little Chance Music

## Goal
Build a single, bespoke interactive musical gift for Bob Pisani: an engraved paper-theater opening followed by a fully functional 16-bar Mozart dice-game composer, presented quietly by Span.

## Experience
- Replace the template with a polished, responsive composing desk in warm ivory, moss, brass, ink, and oxblood, using editorial serif typography, fine rules, paper grain, cut edges, and restrained shadows.
- Add an accessible first-visit paper theater with an original Mozart cutout puppet, keyboard, score, dice props, three timed scenes, manual Next, skip, immediate Start composing, replay, local dismissal memory, and reduced-motion behavior.
- Reveal an immediately playable seeded composition titled “Your minuet, Bob,” with the dedication “A little chance music, for Bob Pisani.”
- Keep Span subdued: lowercase corner wordmark, closing dedication, optional philosophy line, and external Meet Span link.

## Historical Music Engine
- Bundle the UNLICENSE repository’s full 176-measure treble-and-bass data locally at build time, converted to typed source—no runtime GitHub dependency.
- Bundle the 11×16 lookup table, correcting only independently verified source anomalies and documenting that correction.
- Validate all IDs, note/chord/rest tuple shapes, staff durations, uniqueness, and the required position 3 / total 11 → measure 165 mapping.
- Roll two independent fair six-sided dice per bar and preserve their actual faces, producing the correct triangular sum distribution.
- Schedule polyphonic melody and accompaniment with Web Audio in 3/8, using an eighth-note pulse of 60/BPM and clean cancellation of all active voices.

## Composer
- Provide Roll the dice and Choose the numbers modes, tactile dice, full-minuet rolling with staggered truthful updates, per-bar selection and reroll, and a sum 2–12 inspector showing position, total, and historical measure ID.
- Render two phrases of eight score bars with notation derived directly from pitch, onset, duration, rests, accidentals, and chords; highlight playback with a moss wash and brass playhead.
- Add Piano, Harpsichord, Flute, and Strings synthesized timbres, plus honest synthesis labeling, play/pause, restart, progress, volume/mute, and tempo from 60–180 eighth-note pulses per minute.
- Add local saved minuets with Bob-specific default naming, load, rename, confirmed delete, corrupt-storage recovery, and optional JSON download.
- Add deterministic, versioned share links containing all 16 totals, instrument, and tempo; validate malformed links, restore exactly, bypass the intro, and provide clipboard fallback.
- Add a Help/About dialog with the full lookup table, selected path, probability note, source links, license attribution, and the requested disputed-attribution caveat.

## Visual Assets
- Generate an original cohesive engraved Mozart portrait puppet and period paper-theater props rather than relying on stock imagery or runtime hotlinks.
- Create a custom dice/music favicon matching the microsite.

## Technical Details
- Keep the experience at `/` with route-specific title, description, Open Graph, and Twitter metadata.
- Use small focused React modules for music data/types, deterministic state encoding, audio scheduling, notation, theater, composer controls, saved compositions, and About content.
- Use semantic design tokens in the global stylesheet and accessible design-system controls; no backend or account is required.
- Record architecture decisions in `AGENTS.md` and keep all downloaded/generated app assets inside the project.

## Verification
- Add focused automated tests for table uniqueness and mapping, all measure data/durations, fair two-die generation, share-link roundtrips and malformed input, local save/load/rename/delete, and audio scheduling cancellation logic.
- Verify the complete opening and composing flow in Chromium at 1440px desktop and 390px mobile, including keyboard focus, reduced motion, every instrument, tempo changes, repeated play/stop, rerolls, manual edits, saves, sharing, replay, and intro bypass.
- Confirm the preview builds cleanly with no runtime, console, or network failures. Do not publish.

## Assumption
The requested “actual generated musical notation” can be delivered as a custom score renderer tied directly to the complete note tuples, avoiding a heavy notation dependency while preserving pitches, onsets, durations, rests, chords, and accidentals visibly and audibly.
