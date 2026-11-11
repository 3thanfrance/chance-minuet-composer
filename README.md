# Chance Composer

Create a complete, exceptionally polished bespoke prospect microsite for Bob Pisani, presented by Span AI. Project title: "A Little Chance Music". This is a thoughtful musical gift and interactive sales introduction, not a generic SaaS page. Build and test the functioning app, not a mockup.

ART DIRECTION:
Elegant 18th-century paper theater meets a contemporary editorial music studio. Warm ivory rag paper (#F3EDDF), near-black ink (#252820), deep moss green (#344C38), antique brass accents (#B59A61), subtle dusty oxblood details. Beautiful large editorial serif (Cormorant Garamond or equivalent) with legible small clean sans and tasteful mono labels. Delicate rules, generous whitespace, fine engraved ornamental details, asymmetric handmade cut-paper edges and layered shadows. Avoid stock dashboard styling, purple gradients, excessive rounded cards, childish clipart or emojis. Main composition surface should feel like an engraved score and a physical composing desk. Fully responsive.

PERSONALIZATION / BRAND:
Dedicated inscription "A little chance music, for Bob Pisani." throughout title, intro dedication and saved-composition default naming. This is from Span; small restrained span wordmark in an upper corner and "Made for Bob, with curiosity. — Span" below composer. Use a clean lowercase text wordmark as a placeholder if an official brand asset cannot be reliably acquired from https://www.span.app/ . Keep brand subdued. A small optional footer connection: "Good systems make room for possibility." and tasteful external "Meet Span ↗" linking to https://www.span.app/ . No invented quotes, personal biography, employer, endorsement, unsupported product claims, or aggressive sales modal.

SHORT OPENING EXPERIENCE, REQUIRED:
On first visit show an extraordinary paper-cutout historical theater, NOT a slideshow of generic cards. Mozart as an engraved paper silhouette/portrait puppet with a white cut-paper outline on a visible wooden popsicle stick, period keyboard/score/dice props on sticks, shallow stage lip, paper shadows and subtle grain. Use beautiful original illustrated/generated art or a public-domain Mozart engraving with properly cut out silhouette; no emoji Mozart and no crude geometric avatar.
A 12–16 second visual exposition in 3 brief scenes after "Raise the curtain" (unlocks AudioContext if desired), with "Skip to composing" always visible. Copy:
1. "Before code, there was a pair of dice." / "An eighteenth-century musical game, attributed to Mozart."
2. "176 measures. Two dice. One little minuet." / "Each throw chooses the next measure from a carefully arranged table."
3. "Chance chooses. You compose." / "Bob, the next performance is yours."
Scene 2 should include an actual small interactive pair-of-dice roll showing e.g. total 7 selects measure 104 for position 1; don't let it stall the fast intro. Caption strips pop in with charming mechanical paper motion, Mozart bobs lightly, props visibly rise from BELOW and are pulled DOWN by their sticks at scene changes, and all final pieces withdraw downward to reveal the real composer already beneath. Support a discreet Next control, skip at every phase, replay intro, remember dismissed intro locally, respect prefers-reduced-motion (static scenes with Next), never autoplay loud sound on page load. Include a visible "Start composing" from initial screen for immediate access. Keep keyboard focus accessible when overlay closes.

REAL MUSIC ENGINE — NONNEGOTIABLE:
Use the historical 11-row x 16-column table and all actual 176 precomposed measures, preserving treble AND bass, chords, rests, accidentals and durations. NO invented arpeggios, pseudo-Mozart note generator, numbered fake measures, or placeholder music. Source data exists as reusable JS in the UNLICENSE project:
https://github.com/timmydoza/mozart-dice-game
Raw notes (176 numbered entries with treble/bass note/chord/rest tuples):
https://raw.githubusercontent.com/timmydoza/mozart-dice-game/master/lib/notes.js
Raw historical table:
https://raw.githubusercontent.com/timmydoza/mozart-dice-game/master/lib/tables.js
Reference parser for format:
https://raw.githubusercontent.com/timmydoza/mozart-dice-game/master/lib/parse_notes.js
Fetch at BUILD time and bundle locally as typed source/JSON. Do not rely on runtime GitHub requests. Read actual file format before implementing. Entry ['c5',8] is eighth note, [['c3','e3'],4] is quarter-note chord, [8] is eighth rest. Data in 3/8: three eighth-note pulses per bar, eighth-pulse duration=60/BPM. Most measures are 3 eighth pulses, check all durations and handle source anomalies explicitly.
Independent cross-check of table:
https://introcs.cs.princeton.edu/java/assignments/mozart.html
Rows totals 2..12, columns positions 1..16:
96,22,141,41,105,122,11,30,70,121,26,9,112,49,109,14
32,6,128,63,146,46,134,81,117,39,126,56,174,18,116,83
69,95,158,13,153,55,110,24,66,139,15,132,73,58,145,79
40,17,113,85,161,2,159,100,90,176,7,34,67,160,52,170
148,74,163,45,80,97,36,107,25,143,64,125,76,136,1,93
104,157,27,167,154,68,118,91,138,71,150,29,101,162,23,151
152,60,171,53,99,133,21,127,16,155,57,175,43,168,89,172
119,84,114,50,140,86,169,94,120,88,48,166,51,115,72,111
98,142,42,156,75,129,62,123,65,77,19,82,137,38,149,8
3,87,165,61,135,47,147,33,102,4,31,164,144,59,173,78
54,130,10,103,28,37,106,5,35,20,108,92,12,124,44,131
Mapping test: total 11 at position 3 = 165. Every ID 1..176 appears exactly once. Roll TWO independent fair d6 for each position (triangular probability distribution of sums; never pick totals uniformly). 11^16 possible selection sequences; do not claim all sound different or equally likely. Keep scope on the 16-bar minuet, no trio needed.

COMPOSER:
A beautifully framed large "Your minuet, Bob" page title and an immediately functional, seeded 16-bar composition on first entrance. Two modes "Roll the dice" and "Choose the numbers".
- Pair of tactile ivory dice, a strong "Roll a new minuet" action to generate all 16 choices with short staggered updates and truthful resulting die faces. Selected-bar reroll, and selecting any one of 16 bars.
- Manual mode: accessible choice of sum 2–12 for each bar (click bar to edit in a crisp inspector; numeric buttons or small selects). Show selected position, total, original measure number and how lookup works. Changing choice updates music and real notation instantly. Optional lock of bars only if easy; core must be complete.
- Score-like 16-measure strip/grid with fine barlines, actual generated musical notation tied to the note data if using ABCJS/VexFlow; otherwise tasteful note visualization that actually reflects pitches/onsets, not decorative random notation. Show bars 1–16 and original measure IDs, highlight current playing bar with a moss wash/brass playhead. Two musical phrases of eight bars for readability.
- Instrument selector: Piano, Harpsichord, Flute, Strings with distinct pleasant timbres and icons; changing instrument uses same composition. Reliable immediate browser Web Audio, polyphonic melody plus accompaniment; use carefully voiced native synthesizers or locally bundled samples. If synthesized, describe in a small instrument note honestly. Clear Play/Pause or Play/Stop, replay from start, progress, volume/mute. Instruments and tempo can be changed easily; no overlapping playback or dangling notes.
- Tempo slider plus value 60–180 eighth-note pulses/minute (label BPM with explicit eighth-note beat symbol/explanation, default 120); work in 3/8. Stop cancels scheduled notes. Use precise AudioContext scheduling/lookahead. Browser audio resumes on user gesture; handle audio startup/error states and timing end cleanly.
- "Save minuet" to named local collection, clearly labeled "Saved on this device"; load/rename/delete works with confirmation for delete, persists on reload, local storage parse/errors handled.
- "Share" makes a deterministic URL encoding all 16 totals plus instrument/tempo (versioned and validated, robust to malformed URLs); loading share link restores same measure IDs and bypasses intro. Clipboard API with accessible fallback. Do not require account/backend; never claim cloud sync. Save/export a small JSON composition also useful if straightforward.
- Help/About modal shows real original lookup table with selected path and explanation, source links/data attribution, probability note that 7 is more frequent than 2/12, and honest historical caveat.

HISTORY COPY:
Use "Mozart's musical dice game" colloquially, but precise note: "The familiar 176-measure game was published under Mozart's name; its attribution is disputed. It is often labeled K. 516f / K. Anh. 294d, though Mozart's surviving K. 516f manuscript is a distinct source." Authoritative catalogue https://kv.mozarteum.at/de/work/musikalische-wurfelspiele-8820 categorizes these falsely attributed; do not confidently claim Mozart invented algorithmic music or published this in 1787. This caveat belongs in a small About/source note, not an obstruction.

ACCESSIBILITY / DELIVERY:
Desktop polished at 1440 and mobile 390 width, touch usable, good contrast, focus rings, logical headings, screen reader labels, reduced motion. No broken buttons. Custom dice/music favicon and page title. Test all table entries and note data presence/duration, deterministic URL roundtrip and invalid inputs, local save/load, honest dice distribution, no overlaps on repeated Play/Stop, each instrument, tempo, intro skip/replay. Actually perform build and browser verification. Report any source-data anomaly honestly and fix justified errors instead of generating substitute music.
Create the project and preview; do not publish production yet.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://chance-minuet-composer.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/66c01747-83c2-424e-a85c-ad1149ab5693).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
