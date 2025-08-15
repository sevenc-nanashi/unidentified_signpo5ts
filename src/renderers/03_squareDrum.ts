import p5 from "p5";
import { State } from "../state.ts";
import { colors, dotUnit, height, width } from "../const.ts";
import { useRendererContext } from "../utils.ts";
import { midi } from "../midi.ts";
import { easeInQuint, easeOutQuint } from "../easing.ts";
import timeline from "../assets/timeline.mid?mid";
import * as drumVisualizer from "../components/drumVisualizer.ts";
import { characterMidi, characterTimeline } from "../tracks.ts";
import { Note } from "@tonejs/midi/dist/Note";

const visualizerTimeline = timeline.tracks.find(
  (track) => track.name === "visualizer",
)!;
const activateMidi = 67;
const shiftLockMidi = 68;

const size = height * 0.35;

const kickExpand = size * 0.1;
const drumBaseX = width / 2 - size / 2;
const drumEndX = width - drumBaseX;
const drumWidth = drumEndX - drumBaseX;
const drumBaseY =
  height / 2 -
  size / 2 -
  kickExpand / 2 -
  dotUnit * 8 -
  drumVisualizer.cellHeight;

const xPerDrum = (drumWidth - drumVisualizer.cellWidth) / (8 - 1);

export const draw = import.meta.hmrify((p: p5, state: State) => {
  const graphics = import.meta.autoGraphics(p, "square", p.width, p.height);
  const drumGraphics = import.meta.autoGraphics(
    p,
    "drum",
    drumWidth + dotUnit * 2,
    dotUnit * 2 + drumVisualizer.cellHeight,
  );
  const drumTempGraphics = import.meta.autoGraphics(
    p,
    "drumTemp",
    drumVisualizer.cellWidth + dotUnit * 2,
    drumVisualizer.cellHeight + dotUnit * 2,
  );
  const activateNote = visualizerTimeline.notes.find(
    (note) =>
      note.ticks <= state.currentTick &&
      state.currentTick < note.ticks + note.durationTicks &&
      note.midi === activateMidi,
  );
  if (!activateNote) return;

  const shiftLockNote = visualizerTimeline.notes.find(
    (note) =>
      note.ticks <= state.currentTick &&
      state.currentTick < note.ticks + note.durationTicks &&
      note.midi === shiftLockMidi,
  );

  graphics.clear();

  {
    using _context = useRendererContext(drumGraphics);
    drumGraphics.clear();
    drumGraphics.noSmooth();
    drumGraphics.translate(dotUnit, dotUnit);
    drawDrumVisualizer(p, state, drumGraphics, drumTempGraphics, activateNote);
    const shift = shiftLockNote
      ? 0
      : easeInQuint(p.map(state.currentMeasure % 1, 0.5, 1, 0, 1, true)) * 0.8;
    using _context2 = useRendererContext(graphics);
    graphics.drawingContext.shadowColor = "#444f";
    graphics.drawingContext.shadowBlur = dotUnit * 2;
    graphics.image(
      drumGraphics,
      drumBaseX - dotUnit + shift * drumGraphics.width,
      drumBaseY - dotUnit,
      drumGraphics.width * (1 - shift),
      drumGraphics.height,
      shift * drumGraphics.width,
      0,
      drumGraphics.width * (1 - shift),
      drumGraphics.height,
    );
  }

  {
    p.image(graphics, 0, 0, p.width, p.height);
  }
});

function drawDrumVisualizer(
  p: p5,
  state: State,
  graphics: p5.Graphics,
  tempGraphics: p5.Graphics,
  activateNote: Note,
) {
  const drums = drumVisualizer.collectDrums(state, activateNote, 0);
  const flatDrums = drumVisualizer.flattenDrums(drums);
  const groupedDrums = drumVisualizer.groupedDrumsByType(flatDrums);

  for (const [note, noteType] of groupedDrums) {
    if (note.ticks > state.currentTick) {
      continue;
    }

    const numBeats = drumVisualizer.getNumBeats(note.ticks);
    const measure = midi.header.ticksToMeasures(note.ticks);
    const measureDivision =
      Math.floor((measure % 1) * numBeats + 0.00001) + (8 - numBeats);
    const sliceType = drumVisualizer.getSliceType(note, flatDrums);
    let alpha = 255;
    if (measure < Math.floor(state.currentMeasure)) {
      const progress = Math.min((state.currentMeasure % 1) / 0.5, 1);
      const eased = easeOutQuint(progress);
      alpha =
        state.currentMeasure - measure <= 1
          ? 96 * (1 - eased) + 64
          : (measure - state.currentMeasure - 1) * 64;
    }
    let saturation = 0.5 - (alpha / 255) * 0.5;
    if (sliceType !== "1/1") {
      saturation += 0.5;
      saturation = Math.min(saturation, 1);
    }
    const color = characterTimeline.notes.find(
      (timelineNote) =>
        timelineNote.ticks <= note.ticks &&
        note.ticks < timelineNote.ticks + timelineNote.durationTicks &&
        timelineNote.midi >= characterMidi &&
        timelineNote.midi < characterMidi + colors.length,
    )?.midi;
    const primaryColor = color
      ? colors[color - characterMidi]
      : ([
          [255, 255, 255],
          [192, 192, 192],
        ] as const);

    using _context = useRendererContext(tempGraphics);
    tempGraphics.clear();
    tempGraphics.noStroke();
    tempGraphics.noSmooth();
    tempGraphics.noFill();
    tempGraphics.translate(dotUnit, dotUnit);
    // tempGraphics.background(128);
    drumVisualizer.drawDrumUnit(
      tempGraphics,
      state,
      noteType,
      measure,
      primaryColor,
      saturation,
      alpha,
    );
    const drawRect = drumVisualizer.drawRects[sliceType];
    const x = xPerDrum * measureDivision;
    const y = 0;
    graphics.image(
      tempGraphics,
      x + drawRect.x,
      y + drawRect.y,
      drawRect.width,
      drawRect.height,
      drawRect.x + dotUnit,
      drawRect.y + dotUnit,
      drawRect.width,
      drawRect.height,
    );
  }
}
