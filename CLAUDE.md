# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start Vite dev server (hot reload)
npm run build    # tsc + vite build (runs type check first)
npx tsc --noEmit # type check only, no output
```

No test runner is configured.

## Architecture

SimpleDAW is a fully client-side browser DAW. All audio processing happens in Tone.js objects that live **entirely outside React** — React state is a plain data description; the audio engine reads it on each tick.

### State layer (`src/store/useDAWStore.ts`)
Single `useReducer` + Context. The `DAWState` shape:
- `tracks` — metadata only (name, volume, muted, soloed, pan, effects, synth type, editorMode). No pattern data.
- `sections[]` — own all pattern data. `Section.drumPatterns[trackId][voice]` is the step array; `Section.midiNotes[trackId]` is the note list.
- `transport` — `{isPlaying, bpm, metronomeOn, currentStep, currentSectionIdx}`
- `currentSectionId` — which section the editor is showing

When a track is added/removed, the reducer also adds/removes that track's slot from every section's `drumPatterns`/`midiNotes`.

`SET_SECTION_BARS` only ever extends drum patterns (pads with `false`) — it never shrinks stored step arrays, so previously-set steps are preserved if the user increases then decreases bars.

**Track fields added in latest update:**
- `soloed: boolean` — `SOLO_TRACK` action toggles solo on one track and clears all others. Audio engine computes effective mute: if any track is soloed, non-soloed tracks are silenced.
- `pan: number` — -1 (full left) to +1 (full right), 0 = center. `SET_TRACK_PAN` action, clamped to [-1, 1].
- `effects: TrackEffects` — `{ reverbWet: number; delayWet: number }` both 0–1. `SET_TRACK_EFFECTS` action.

**Persistence (`src/store/persistence.ts`):** `saveToLocalStorage(state)` and `loadFromLocalStorage()` serialise `DAWState` to `localStorage` under key `simpledaw-v1`. `AudioBuffer` fields are stripped before serialising (not JSON-serialisable). `LOAD_STATE` action merges a `Partial<DAWState>` into `initialState`.

### Audio layer (`src/audio/`)

**Signal chain for every track engine:**
```
synths/player → vol → reverb (wet=0 default) → delay (wet=0 default) → pan → masterBus
```

- **`masterBus.ts`** — singleton `Tone.Volume(0) → Tone.Limiter(-1) → Destination`. All engines connect to `masterBus` instead of `Tone.getDestination()` directly. Imported as a side-effect in `AudioEngine.ts` to ensure it initialises first.
- **`AudioEngine`** — singleton (`audioEngine`). Uses `Tone.getTransport().scheduleRepeat` (not `Tone.Sequence`) with an `arrangementPos = {sectionIdx, loopIdx, step}` to walk through sections in order, respecting each section's `loopCount`. The repeat callback is extracted into `makeStepCallback()` — used by both `play()` and `exportAudio()` to avoid duplication. Calls `Tone.getDraw().schedule()` to push step updates back to the UI thread. `exportAudio(state): Promise<Blob>` records one full arrangement pass using `Tone.Recorder`. `syncTrackEngines` computes effective mute (solo logic), then calls `setVolume`, `setPan`, `setEffects` on each engine.
- **`DrumEngine`** — one instance per drum track. Wraps `MembraneSynth` (kick/tom), `NoiseSynth` (snare/clap), `MetalSynth` (hihat/openhat). `fireStep(time, step, voices)` where `voices` is `Record<DrumVoice, boolean[]>`. Has `setPan(value)` and `setEffects(reverbWet, delayWet)`.
- **`MidiEngine`** — one instance per MIDI track. Holds a `PolySynth<any>` + optional **preset** effect chain. 10 presets: `synth`, `amsynth`, `fmsynth`, `pluck`, `pad`, `bass`, `lead`, `bell`, `keys`, `organ`. `setSynthType` disposes only the synth and preset effects — the permanent user effects chain (userReverb → userDelay → pan → masterBus) is never torn down. Has `setPan(value)` and `setEffects(reverbWet, delayWet)`. `previewNote(pitch)` fires a single note immediately (used by piano key clicks).
- **`PlayerEngine`** — one instance per recorded track. Wraps a looping `Tone.Player` synced to transport. Has `setPan(value)` and `setEffects(reverbWet, delayWet)`.

### Bridge (`src/audio/useAudioEngine.ts`)
Mounted once at app level. Three effects:
1. Registers `onStepChange(sectionIdx, step)` callback → dispatches `SET_CURRENT_STEP`
2. Calls `audioEngine.syncState(state)` on every render (BPM sync + track engine lifecycle)
3. Calls `audioEngine.play(state)` / `audioEngine.stop()` on play/stop transitions

### MIDI editor modes
`MidiTrack.editorMode` is `'pianoroll' | 'stepseq'`. `PianoRoll` shows a 48-key grid (MIDI 36–83) where drag-right creates multi-step notes and click-on-note deletes. `MidiStepSeq` is a single-pitch step sequencer using `MidiTrack.stepSeqPitch`. Both dispatch to `Section.midiNotes`.

### Tone.js v15 specifics
- `Tone.getTransport()` not `Tone.Transport`
- `Tone.getDraw()` not `Tone.Draw`
- `MetalSynth` does not accept `frequency` in constructor options — set `synth.frequency.value` after construction
- `NoiseSynth.triggerAttackRelease` takes no pitch argument
- `Tone.Chorus` must call `.start()` before audio flows through it
- `PolySynth<DuoSynth>` is not assignable to `PolySynth<Synth>` — use `PolySynth<any>` when a field must hold multiple synth types
