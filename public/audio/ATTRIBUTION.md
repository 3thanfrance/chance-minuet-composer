# Recorded instrument samples

- Grand piano: Salamander Grand Piano V2, Yamaha C5, recorded by Alexander Holm. CC BY 3.0. This site bundles a single-velocity minor-third subset. https://github.com/Tonejs/audio/tree/master/salamander
- Harpsichord: Versilian Community Sample Library, English Zuckermann kit, Normal sustains. CC0. The source library labels middle C as C3; the player maps it to scientific C4. WAV sources were transcoded to mono 44.1 kHz MP3 for the web. https://github.com/sgossner/VCSL
- Violin, cello, flute, clarinet, and harp: processed sample set assembled by Nathan Bro(s)owsky for tonejs-instruments, CC BY 3.0 processed samples (code MIT), with original source details in sample-source-info.txt. https://github.com/nbrosowsky/tonejs-instruments

Only the locally bundled notes listed in `src/lib/sampleManifest.ts` are loaded. Nearby pitches use normal sample playback-rate transposition.
