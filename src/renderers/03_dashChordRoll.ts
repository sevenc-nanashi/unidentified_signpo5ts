import p5 from "p5";
import { State } from "../state.ts";
import { dotUnit, height, width } from "../const.ts";
import { useRendererContext } from "../utils.ts";
import { midi } from "../midi.ts";
import { easeOutQuint } from "../easing.ts";
import timeline from "../assets/timeline.mid?mid";
import { Note } from "@tonejs/midi/dist/Note";

const visualizerTimeline = timeline.tracks.find(
  (track) => track.name === "visualizer",
)!;
const activateMidi = 66;
const chordTrack =
  midi.tracks[midi.tracks.findIndex((track) => track.name === "chords") + 4];

const topMidi = 74;
const noteHeight = dotUnit * 2;
const yShift = noteHeight * 8;
const baseY = height * 0.75 - yShift;
const areaWidth = width * 0.175;
const areaMeasure = 2;

const currentTickQuantizer = midi.header.ppq / 8;
const activeDuration = midi.header.ppq;
const alphaQuantization = 1 / 8;
export const draw = import.meta.hmrify((p: p5, state: State) => {
  const graphics = import.meta.autoGraphics(
    p,
    "roll",
    areaWidth,
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
  graphics.translate(0, yShift);

  const filteredNotes = getFilteredNotes(activateNote);
  const currentTick =
    Math.floor(state.currentTick / currentTickQuantizer) * currentTickQuantizer;
  const currentMeasure = midi.header.ticksToMeasures(currentTick);
  for (const note of filteredNotes) {
    const leftX = p.map(
      midi.header.ticksToMeasures(note.ticks),
      currentMeasure - areaMeasure,
      currentMeasure,
      0,
      areaWidth,
    );
    const rightX = p.map(
      midi.header.ticksToMeasures(note.ticks + note.durationTicks),
      currentMeasure - areaMeasure,
      currentMeasure,
      0,
      areaWidth,
    );
    if (rightX < 0 || leftX > areaWidth) continue;

    const y = (topMidi - note.midi) * noteHeight;
    // const isActive =
    //   note.ticks <= state.currentTick &&
    //   state.currentTick < note.ticks + note.durationTicks;
    //
    // graphics.fill(255, isActive ? 255 : 64);
    graphics.fill(
      255,
      p.map(
        Math.ceil(
          easeOutQuint(
            p.map(
              state.currentTick,
              note.ticks + note.durationTicks,
              note.ticks + note.durationTicks + activeDuration,
              0,
              1,
              true,
            ),
          ) / alphaQuantization,
        ) * alphaQuantization,
        0,
        1,
        255,
        64,
        true,
      ),
    );
    graphics.rect(leftX, y, rightX - leftX, noteHeight);
  }

  p.image(graphics, 0, baseY, graphics.width, graphics.height);
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
