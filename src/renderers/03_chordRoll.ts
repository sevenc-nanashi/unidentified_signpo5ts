import p5 from "p5";
import { State } from "../state.ts";
import { dotUnit, height, reiColor, tycColor, width } from "../const.ts";
import { useRendererContext } from "../utils.ts";
import { midi, ust, ustToMidiMultiplier } from "../midi.ts";
import timeline from "../assets/timeline.mid?mid";
import { Note } from "@tonejs/midi/dist/Note";

const visualizerTimeline = timeline.tracks.find(
  (track) => track.name === "visualizer",
)!;
const activateMidi = 62;
const chordTrack = midi.tracks.find((track) => track.name === "LABS")!;
const tycChorusTrack = ust.tracks[2];
const reiChorusTrack = ust.tracks[3];

const topMidi = 74;
const baseY = height * 0.75;
const baseX = width * 0.2;
const endX = width - baseX;
const noteAreaWidth = endX - baseX;
const noteHeight = dotUnit * 2;

export const draw = import.meta.hmrify((p: p5, state: State) => {
  const graphics = import.meta.autoGraphics(
    p,
    "roll",
    noteAreaWidth,
    height - baseY,
  );
  const activateNote = visualizerTimeline.notes.find(
    (note) =>
      note.ticks <= state.currentTick &&
      state.currentTick < note.ticks + note.durationTicks &&
      note.midi === activateMidi,
  );
  if (!activateNote) return;

  using _context = useRendererContext(graphics);
  graphics.clear();
  graphics.noSmooth();
  graphics.noStroke();

  const filteredNotes = getFilteredNotes(activateNote);
  for (const note of filteredNotes) {
    const leftX = p.map(
      note.ticks,
      activateNote.ticks,
      activateNote.ticks + activateNote.durationTicks,
      0,
      noteAreaWidth,
    );
    const rightX = p.map(
      note.ticks + note.durationTicks,
      activateNote.ticks,
      activateNote.ticks + activateNote.durationTicks,
      0,
      noteAreaWidth,
    );
    const y = (topMidi - note.midi) * noteHeight;
    const isActive =
      note.ticks <= state.currentTick &&
      state.currentTick < note.ticks + note.durationTicks;

    const hasTycChorus = tycChorusTrack.notes.some(
      (chorusNote) =>
        Math.floor(chorusNote.tickOn * ustToMidiMultiplier) === note.ticks &&
        chorusNote.key === note.midi,
    );
    const hasReiChorus = reiChorusTrack.notes.some(
      (chorusNote) =>
        Math.floor(chorusNote.tickOn * ustToMidiMultiplier) === note.ticks &&
        chorusNote.key === note.midi,
    );

    if (hasTycChorus) {
      graphics.fill(...tycColor, isActive ? 255 : 64);
    } else if (hasReiChorus) {
      graphics.fill(...reiColor, isActive ? 255 : 64);
    } else {
      graphics.fill(255, isActive ? 255 : 64);
    }
    graphics.rect(leftX, y, rightX - leftX, noteHeight);
  }

  p.image(graphics, baseX, baseY, graphics.width, graphics.height);
});

function getFilteredNotes(activateNote: Note) {
  const allSectionNotes = chordTrack.notes.filter(
    (note) =>
      note.ticks >= activateNote.ticks &&
      note.ticks < activateNote.ticks + activateNote.durationTicks,
  );
  const filteredNotes = allSectionNotes.filter((note) => {
    const sameTimingNotes = allSectionNotes.filter(
      (n) => n.ticks === note.ticks,
    );
    return sameTimingNotes.some(
      (n) => n.midi !== note.midi && Math.abs(n.midi - note.midi) <= 11,
    );
  });

  return filteredNotes.sort((a, b) => a.ticks - b.ticks);
}
