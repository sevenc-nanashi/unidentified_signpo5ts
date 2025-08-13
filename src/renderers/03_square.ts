import p5 from "p5";
import { State } from "../state.ts";
import { colors, dotUnit, height, width } from "../const.ts";
import { useRendererContext } from "../utils.ts";
import { DrumDefinition, drumDefinition } from "../drum.ts";
import { midi } from "../midi.ts";
import { easeInQuint, easeOutQuint } from "../easing.ts";
import timeline from "../assets/timeline.mid?mid";
import { Track } from "@tonejs/midi";
import * as drumVisualizer from "../components/drumVisualizer.ts";
import { characterMidi, characterTimeline } from "../tracks.ts";
import { Note } from "@tonejs/midi/dist/Note";

const visualizerTimeline = timeline.tracks.find(
  (track) => track.name === "visualizer",
)!;
const activateMidi = 61;

const size = height * 0.35;
const expand = size * 0.1;
const snareExpand = height * 0.1;
const effect = height * 0.15;
const expandDuration = 0.25;
const snareExpandDuration = 0.5;
const effectDuration = 1;

const drumBaseX = width / 2 - size / 2;
const drumEndX = width - drumBaseX;
const drumWidth = drumEndX - drumBaseX;
const drumBaseY =
  height / 2 - size / 2 - expand / 2 - dotUnit * 8 - drumVisualizer.cellHeight;

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

  graphics.clear();
  {
    using _context = useRendererContext(graphics);
    graphics.translate(p.width / 2, p.height / 2);
    graphics.rectMode(p.CENTER);
    graphics.noSmooth();
    graphics.stroke(255);

    for (const [track, notes] of drumDefinition) {
      drawKickEffects(p, graphics, state, track, notes);
      drawSnareEffects(p, graphics, state, track, notes);
    }

    drawSquare(state, p, graphics);
  }

  {
    using _context = useRendererContext(drumGraphics);
    drumGraphics.clear();
    drumGraphics.noSmooth();
    drumGraphics.translate(dotUnit, dotUnit);
    drawDrumVisualizer(p, state, drumGraphics, drumTempGraphics, activateNote);
    const shift =
      easeInQuint(p.map(state.currentMeasure % 1, 0.5, 1, 0, 1, true)) * 0.8;
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

  p.image(graphics, 0, 0, p.width, p.height);
});
function drawKickEffects(
  p: p5,
  graphics: p5.Graphics,
  state: State,
  track: Track,
  notes: Partial<DrumDefinition>,
) {
  const activeKicks = track.notes.filter(
    (note) =>
      note.ticks <= state.currentTick &&
      midi.header.ticksToMeasures(note.ticks) + effectDuration >
        state.currentMeasure &&
      note.midi === notes.kick,
  );
  for (const activeKick of activeKicks) {
    const progress = p.map(
      state.currentMeasure,
      midi.header.ticksToMeasures(activeKick.ticks),
      midi.header.ticksToMeasures(activeKick.ticks) + effectDuration,
      0,
      1,
    );
    const effectSize = p.lerp(
      size + expand,
      size + expand + effect,
      easeOutQuint(progress),
    );
    graphics.strokeWeight(p.lerp(dotUnit, 0, progress));
    graphics.stroke(255, 255, 255, 192 * (1 - easeOutQuint(progress)));
    graphics.noFill();
    graphics.rect(0, 0, effectSize, effectSize);
  }
}

function drawSquare(state: State, p: p5, graphics: p5.Graphics) {
  let currentSize = size;
  for (const [track, notes] of drumDefinition) {
    if (!notes.kick) {
      continue;
    }

    const lastKick = track.notes.findLast(
      (note) => note.ticks <= state.currentTick && note.midi === notes.kick,
    );

    if (lastKick) {
      const progress = p.map(
        state.currentMeasure,
        midi.header.ticksToMeasures(lastKick.ticks),
        midi.header.ticksToMeasures(lastKick.ticks) + expandDuration,
        0,
        1,
      );
      currentSize = p.lerp(size + expand, size, easeOutQuint(progress));
    }
  }

  graphics.stroke(255);
  graphics.strokeWeight(dotUnit * 2);
  graphics.noFill();

  graphics.rect(0, 0, currentSize, currentSize);
  return currentSize;
}

function drawSnareEffects(
  p: p5,
  graphics: p5.Graphics,
  state: State,
  track: Track,
  notes: Partial<DrumDefinition>,
) {
  const activeSnares = track.notes.filter(
    (note) =>
      note.ticks <= state.currentTick &&
      midi.header.ticksToMeasures(note.ticks) + snareExpandDuration >
        state.currentMeasure &&
      note.midi === notes.snare,
  );
  for (const activeSnare of activeSnares) {
    const progress = p.map(
      state.currentMeasure,
      midi.header.ticksToMeasures(activeSnare.ticks),
      midi.header.ticksToMeasures(activeSnare.ticks) + snareExpandDuration,
      0,
      1,
    );
    const effectSize = p.lerp(size, size - snareExpand, easeOutQuint(progress));
    graphics.strokeWeight(p.lerp(dotUnit * 2, 0, progress));
    graphics.stroke(255, 255, 255, 255 * (1 - easeOutQuint(progress)));
    graphics.noFill();
    graphics.rect(0, 0, effectSize, effectSize);
  }
}

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
    const primaryColor = colors[color ? color - characterMidi : 0];
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
