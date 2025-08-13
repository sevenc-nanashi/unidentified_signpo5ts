import p5 from "p5";
import { State } from "../state.ts";
import { bg, colors, dotUnit, height, width } from "../const.ts";
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

const kickExpand = size * 0.1;
const expandDuration = 0.25;

const snareExpand = height * 0.1;
const snareExpandDuration = 0.5;

const effect = height * 0.15;
const effectDuration = 1;

const cymbalDuration = 1;
const cymbalSize = height * 0.15;

const clapDuration = 0.5;
const clapSize = height * 0.1;
const clapPadding = dotUnit * 2;

const starDuration = 2;
const starSize = size * 0.9;
const starWeight = dotUnit * 2;
const starDivs = 10;
const starSwitch = 1 / 32;

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
  const bgGraphics = import.meta.autoGraphics(
    p,
    "background",
    p.width,
    p.height,
  );
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
    using _context2 = useRendererContext(bgGraphics);
    bgGraphics.translate(p.width / 2, p.height / 2);
    bgGraphics.rectMode(p.CENTER);
    bgGraphics.noSmooth();

    graphics.drawingContext.shadowColor = "#444f";
    graphics.drawingContext.shadowBlur = dotUnit * 2;
    drawSquare(state, p, graphics, bgGraphics, activateNote);
  }

  {
    using _context = useRendererContext(drumGraphics);
    drumGraphics.clear();
    drumGraphics.noSmooth();
    drumGraphics.translate(dotUnit, dotUnit);
    drawDrumVisualizer(p, state, drumGraphics, drumTempGraphics, activateNote);
    const shift =
      easeInQuint(p.map(state.currentMeasure % 1, 0.5, 1, 0, 1, true)) * 0.8;
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
    using _context = useRendererContext(graphics);
    graphics.translate(p.width / 2, p.height / 2);
    graphics.rectMode(p.CENTER);
    graphics.noSmooth();
    graphics.stroke(255);
    for (const [track, notes] of drumDefinition) {
      {
        using _context = useRendererContext(graphics);
        graphics.drawingContext.shadowColor = "#4448";
        graphics.drawingContext.shadowBlur = dotUnit * 2;
        drawKickEffects(p, graphics, state, track, notes, activateNote);
        drawSnareEffects(p, graphics, state, track, notes, activateNote);
        drawClapEffects(p, graphics, state, track, notes, activateNote);
        drawStar(p, graphics, state, track, notes, activateNote);
      }
      drawCymbalEffects(p, graphics, state, track, notes, activateNote);
    }
  }

  {
    using _context = useRendererContext(p);
    p.tint(255, 255, 255, 128);
    p.image(bgGraphics, 0, 0, p.width, p.height);
  }
  {
    p.image(graphics, 0, 0, p.width, p.height);
  }
});
function drawKickEffects(
  p: p5,
  graphics: p5.Graphics,
  state: State,
  track: Track,
  notes: Partial<DrumDefinition>,
  activateNote: Note,
) {
  const activeKicks = track.notes.filter(
    (note) =>
      note.ticks > activateNote.ticks &&
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
      size + kickExpand,
      size + kickExpand + effect,
      easeOutQuint(progress),
    );
    graphics.strokeWeight(p.lerp(dotUnit, 0, progress));
    graphics.stroke(255, 255, 255, 192 * (1 - easeOutQuint(progress)));
    graphics.noFill();
    graphics.rect(0, 0, effectSize, effectSize);
  }
}

function drawSquare(
  state: State,
  p: p5,
  graphics: p5.Graphics,
  bgGraphics: p5.Graphics,
  activateNote: Note,
) {
  let kickExpandSize = 0;
  for (const [track, notes] of drumDefinition) {
    const lastKick = track.notes.findLast(
      (note) =>
        note.ticks > activateNote.ticks &&
        note.ticks <= state.currentTick &&
        note.midi === notes.kick,
    );

    if (lastKick) {
      const progress = p.map(
        state.currentMeasure,
        midi.header.ticksToMeasures(lastKick.ticks),
        midi.header.ticksToMeasures(lastKick.ticks) + expandDuration,
        0,
        1,
      );
      kickExpandSize = p.lerp(kickExpand, 0, easeOutQuint(progress));
    }
  }

  graphics.stroke(255);
  graphics.strokeWeight(dotUnit * 2);
  graphics.noFill();

  const currentSize = size + kickExpandSize;
  graphics.rect(0, 0, currentSize, currentSize);

  bgGraphics.clear();
  bgGraphics.noSmooth();
  bgGraphics.background(0, 0, 0);
  // @ts-expect-error p5.ts is broken
  bgGraphics.blendMode(p.REMOVE);
  bgGraphics.rect(0, 0, currentSize, currentSize);
}

function drawSnareEffects(
  p: p5,
  graphics: p5.Graphics,
  state: State,
  track: Track,
  notes: Partial<DrumDefinition>,
  activateNote: Note,
) {
  const activeSnares = track.notes.filter(
    (note) =>
      note.ticks > activateNote.ticks &&
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
function drawCymbalEffects(
  p: p5,
  graphics: p5.Graphics,
  state: State,
  track: Track,
  notes: Partial<DrumDefinition>,
  activateNote: Note,
) {
  const lastCymbal = track.notes.findLast(
    (note) =>
      note.ticks > activateNote.ticks &&
      note.ticks <= state.currentTick &&
      midi.header.ticksToMeasures(note.ticks) + cymbalDuration >
        state.currentMeasure &&
      note.midi === notes.cymbal,
  );
  if (!lastCymbal) return;
  const progress = p.map(
    state.currentMeasure,
    midi.header.ticksToMeasures(lastCymbal.ticks),
    midi.header.ticksToMeasures(lastCymbal.ticks) + cymbalDuration,
    0,
    1,
  );
  graphics.fill(255, 255, 255, 255 * (1 - progress));
  graphics.noStroke();
  graphics.rect(0, 0, cymbalSize, cymbalSize);
}
function drawClapEffects(
  p: p5,
  graphics: p5.Graphics,
  state: State,
  track: Track,
  notes: Partial<DrumDefinition>,
  activateNote: Note,
) {
  const activeClaps = track.notes.filter(
    (note) =>
      note.ticks > activateNote.ticks &&
      note.ticks <= state.currentTick &&
      midi.header.ticksToMeasures(note.ticks) + clapDuration >
        state.currentMeasure &&
      note.midi === notes.clap,
  );
  for (const activeClap of activeClaps) {
    const progress = p.map(
      state.currentMeasure,
      midi.header.ticksToMeasures(activeClap.ticks),
      midi.header.ticksToMeasures(activeClap.ticks) + clapDuration,
      0,
      1,
    );
    graphics.stroke(255, 255, 255, 255 * (1 - easeOutQuint(progress)));
    graphics.noFill();
    graphics.strokeWeight(p.lerp(dotUnit * 2, 0, progress));
    graphics.strokeCap(p.SQUARE);
    const shift = p.lerp(0, clapSize, easeOutQuint(progress));
    const expandSize = size + kickExpand;
    const verticalSize = size + dotUnit * 4;
    graphics.line(
      -expandSize / 2 - clapPadding - shift,
      -verticalSize / 2,
      -expandSize / 2 - clapPadding - shift,
      verticalSize / 2,
    );
    graphics.line(
      expandSize / 2 + clapPadding + shift,
      -verticalSize / 2,
      expandSize / 2 + clapPadding + shift,
      verticalSize / 2,
    );
  }
}

function drawStar(
  p: p5,
  graphics: p5.Graphics,
  state: State,
  track: Track,
  notes: Partial<DrumDefinition>,
  activateNote: Note,
) {
  const tempGraphics = import.meta.autoGraphics(p, "starTemp", size, size);
  const lastStar = track.notes.findLast(
    (note) =>
      midi.header.ticksToMeasures(note.ticks) + starDuration >
        state.currentMeasure &&
      note.ticks < state.currentTick &&
      note.midi === notes.star,
  );
  if (!lastStar) return;
  const progress = p.map(
    state.currentMeasure,
    midi.header.ticksToMeasures(lastStar.ticks),
    midi.header.ticksToMeasures(lastStar.ticks) + starDuration,
    0,
    1,
  );
  using _context = useRendererContext(tempGraphics);

  tempGraphics.clear();
  tempGraphics.noStroke();
  tempGraphics.fill(255, 255, 255, 255);
  tempGraphics.translate(tempGraphics.width / 2, tempGraphics.height / 2);
  tempGraphics.rect(-starSize / 2, -starSize / 2, starSize, starWeight);
  tempGraphics.rect(-starSize / 2, -starSize / 2, starWeight, starSize);
  tempGraphics.rect(
    starSize / 2 - starWeight,
    -starSize / 2,
    starWeight,
    starSize,
  );
  tempGraphics.rect(
    -starSize / 2,
    starSize / 2 - starWeight,
    starSize,
    starWeight,
  );

  {
    using _context = useRendererContext(tempGraphics);
    // tempGraphics.erase(255, 0);
    const cellSize = starSize / (starDivs + 1);
    const invert =
      Math.floor(
        (state.currentMeasure - midi.header.ticksToMeasures(lastStar.ticks)) /
          starSwitch,
      ) % 2;
    for (let x = 0; x <= starDivs; x++) {
      for (let y = 0; y <= starDivs; y++) {
        const xPos = -starSize / 2 + cellSize * x;
        const yPos = -starSize / 2 + cellSize * y;
        if ((x + y) % 2 === invert) {
          // @ts-expect-error p5.ts is broken
          tempGraphics.blendMode(p.REMOVE);
          tempGraphics.rect(xPos, yPos, cellSize, cellSize);
        }
      }
    }
  }

  graphics.tint(255, 255, 255, 255 * (1 - progress));
  graphics.image(
    tempGraphics,
    -tempGraphics.width / 2,
    -tempGraphics.height / 2,
    tempGraphics.width,
    tempGraphics.height,
  );
}
