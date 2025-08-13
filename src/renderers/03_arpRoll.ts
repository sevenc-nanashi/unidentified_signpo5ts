import p5 from "p5";
import { State } from "../state.ts";
import { dotUnit, height, width } from "../const.ts";
import { useRendererContext } from "../utils.ts";
import { midi } from "../midi.ts";
import { easeOutQuint } from "../easing.ts";
import timeline from "../assets/timeline.mid?mid";

const visualizerTimeline = timeline.tracks.find(
  (track) => track.name === "visualizer",
)!;
const activateMidi = 66;
const arpTrack =
  midi.tracks[midi.tracks.findIndex((track) => track.name === "arp") + 2];

const topMidi = 74;
const noteHeight = dotUnit * 2;
const noteWidth = noteHeight * 1;
const yShift = noteHeight * 8;
const baseY = height * 0.75 - yShift;
const areaWidth = width * 0.175;

const noteIndex = [0, 1, 2, 3, 4, 3, 2, 1];

const numPastDraw = 64;
const ticksPerDraw = midi.header.ppq / 8;
const activeDuration = midi.header.ppq * 2;
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

  for (let i = 0; i < numPastDraw; i++) {
    const x = noteWidth * i;
    if (x > areaWidth) break;
    const currentTick = state.currentTick - i * ticksPerDraw;
    const currentMeasure =
      midi.header.ticksToMeasures(currentTick) -
      midi.header.ticksToMeasures(activateNote.ticks);
    const arpIndex = Math.floor(currentMeasure * 16) % 16;

    const currentIndex = noteIndex[arpIndex % noteIndex.length];

    const currentNotes = arpTrack.notes
      .filter(
        (note) =>
          currentTick >= note.ticks &&
          currentTick < note.ticks + note.durationTicks,
      )
      .toSorted((a, b) => a.midi - b.midi);

    const currentNote = currentNotes[currentIndex] || currentNotes[0];
    if (!currentNote) break;
    const y = (topMidi - currentNote.midi) * noteHeight;

    graphics.fill(
      255,
      p.map(
        Math.ceil(
          easeOutQuint(
            p.map(
              state.currentTick,
              Math.floor(currentTick / ticksPerDraw) * ticksPerDraw,
              Math.floor(currentTick / ticksPerDraw) * ticksPerDraw +
                activeDuration,
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
    graphics.rect(x, y, noteWidth, noteHeight);
  }

  p.image(
    graphics,
    p.width - graphics.width,
    baseY,
    graphics.width,
    graphics.height,
  );
});
