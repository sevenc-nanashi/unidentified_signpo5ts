import p5 from "p5";
import { State } from "../state.ts";
import timeline from "../assets/timeline.mid?mid";

const flashTimeline = timeline.tracks.find((track) => track.name === "flash")!;
const blueFlashMidi = 36;
const flashMidi = 48;
const fadeMidi = 60;

export const draw = import.meta.hmrify((p: p5, state: State) => {
  const flashNote = flashTimeline.notes.findLast(
    (note) =>
      note.ticks <= state.currentTick &&
      state.currentTick < note.ticks + note.durationTicks &&
      note.midi >= flashMidi &&
      note.midi < flashMidi + 12,
  );
  if (flashNote) {
    p.background(
      255,
      p.map(
        state.currentTick,
        flashNote.ticks,
        flashNote.ticks + flashNote.durationTicks,
        255 * flashNote.velocity,
        0,
      ),
    );
  }

  const blueFlashNotes = flashTimeline.notes.filter(
    (note) =>
      note.ticks <= state.currentTick &&
      state.currentTick < note.ticks + note.durationTicks &&
      note.midi >= blueFlashMidi &&
      note.midi < blueFlashMidi + 12,
  );
  for (const blueFlashNote of blueFlashNotes) {
    p.background(
      230,
      240,
      255,
      p.map(
        state.currentTick,
        blueFlashNote.ticks,
        blueFlashNote.ticks + blueFlashNote.durationTicks,
        255 * blueFlashNote.velocity,
        0,
      ),
    );
  }

  const fadeNotes = flashTimeline.notes.filter(
    (note) =>
      note.ticks <= state.currentTick &&
      state.currentTick < note.ticks + note.durationTicks &&
      note.midi >= fadeMidi &&
      note.midi < fadeMidi + 12,
  );
  for (const fadeNote of fadeNotes) {
    p.background(
      255,
      p.map(
        state.currentTick,
        fadeNote.ticks,
        fadeNote.ticks + fadeNote.durationTicks,
        0,
        255 * fadeNote.velocity,
      ),
    );
  }
});
