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
- `tracks` — metadata only (name, volume, muted, synth type). No pattern data.
- `sections[]` — own all pattern data. `Section.drumPatterns[trackId][voice]` is the step array; `Section.midiNotes[trackId]` is the note list.
- `transport` — `{isPlaying, bpm, metronomeOn, currentStep, currentSectionIdx}`
- `currentSectionId` — which section the editor is showing

When a track is added/removed, the reducer also adds/removes that track's slot from every section's `drumPatterns`/`midiNotes`.

### Audio layer (`src/audio/`)
- **`AudioEngine`** — singleton (`audioEngine`). Uses `Tone.getTransport().scheduleRepeat` (not `Tone.Sequence`) with an `arrangementPos = {sectionIdx, loopIdx, step}` to walk through sections in order, respecting each section's `loopCount`. Calls `Tone.getDraw().schedule()` to push step updates back to the UI thread.
- **`DrumEngine`** — one instance per drum track. Wraps `MembraneSynth` (kick/tom), `NoiseSynth` (snare/clap), `MetalSynth` (hihat/openhat). `fireStep(time, step, voices)` where `voices` is `Record<DrumVoice, boolean[]>`.
- **`MidiEngine`** — one instance per MIDI track. Holds a `PolySynth<any>` + optional effect chain. 10 presets: `synth`, `amsynth`, `fmsynth`, `pluck`, `pad`, `bass`, `lead`, `bell`, `keys`, `organ`. Swapping synth type disposes the old synth and effects, then builds new ones.
- **`PlayerEngine`** — one instance per recorded track. Wraps a looping `Tone.Player` synced to transport.

### Bridge (`src/audio/useAudioEngine.ts`)
Mounted once at app level. Three effects:
1. Registers `onStepChange(sectionIdx, step)` callback → dispatches `SET_CURRENT_STEP`
2. Calls `audioEngine.syncState(state)` on every render (BPM sync + track engine lifecycle)
3. Calls `audioEngine.play(state)` / `audioEngine.stop()` on play/stop transitions

### Tone.js v15 specifics
- `Tone.getTransport()` not `Tone.Transport`
- `Tone.getDraw()` not `Tone.Draw`
- `MetalSynth` does not accept `frequency` in constructor options — set `synth.frequency.value` after construction
- `NoiseSynth.triggerAttackRelease` takes no pitch argument
- `Tone.Chorus` must call `.start()` before audio flows through it
- `PolySynth<DuoSynth>` is not assignable to `PolySynth<Synth>` — use `PolySynth<any>` when a field must hold multiple synth types
