import p5 from "p5";
import { State } from "../state.ts";
import { dotUnit, height } from "../const.ts";
import { useRendererContext } from "../utils.ts";
import { DrumDefinition, drumDefinition } from "../drum.ts";
import { midi } from "../midi.ts";
import { easeOutQuint } from "../easing.ts";
import timeline from "../assets/timeline.mid?mid";
import { Track } from "@tonejs/midi";
import { Note } from "@tonejs/midi/dist/Note";

const visualizerTimeline = timeline.tracks.find(
  (track) => track.name === "visualizer",
)!;
const activateMidi = 61;

const size = height * 0.375;

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
const starPadding = 1;
const starDivs = 10;
const starSwitch = 1 / 32;

export const draw = import.meta.hmrify((p: p5, state: State) => {
  const graphics = import.meta.autoGraphics(p, "square", p.width, p.height);
  const bgGraphics = import.meta.autoGraphics(
    p,
    "background",
    p.width,
    p.height,
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
      {
        using _context = useRendererContext(graphics);
        graphics.drawingContext.shadowColor = "#4448";
        graphics.drawingContext.shadowBlur = dotUnit * 2;

        drawMiniCymbalEffects(p, graphics, state, track, notes, activateNote);
        drawCymbalEffects(p, graphics, state, track, notes, activateNote);
      }
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

function drawMiniCymbalEffects(
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
      note.midi === notes.miniCymbal,
  );
  if (!lastCymbal) return;
  const progress = p.map(
    state.currentMeasure,
    midi.header.ticksToMeasures(lastCymbal.ticks),
    midi.header.ticksToMeasures(lastCymbal.ticks) + cymbalDuration,
    0,
    1,
  );
  graphics.fill(255, 255, 255, 192 * (1 - progress));
  graphics.noStroke();
  graphics.rect(0, 0, cymbalSize, cymbalSize);
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
  const tempGraphics = import.meta.autoGraphics(
    p,
    "starTemp",
    size + starPadding * 2,
    size + starPadding * 2,
  );
  const lastStar = track.notes.findLast(
    (note) =>
      midi.header.ticksToMeasures(note.ticks) + starDuration >
        state.currentMeasure &&
      note.ticks < state.currentTick &&
      note.midi === notes.star,
  );
  const lastRevStar = track.notes.findLast(
    (note) =>
      note.ticks < state.currentTick &&
      note.ticks + note.durationTicks > state.currentTick &&
      note.midi === notes.revStar,
  );
  if (!lastStar && !lastRevStar) return;
  let progress: number = 1;

  if (lastRevStar) {
    progress = p.map(
      state.currentTick,
      lastRevStar.ticks,
      lastRevStar.ticks + lastRevStar.durationTicks,
      1,
      0.3,
      true,
    );
  }
  if (lastStar) {
    progress = p.map(
      state.currentMeasure,
      midi.header.ticksToMeasures(lastStar.ticks),
      midi.header.ticksToMeasures(lastStar.ticks) + starDuration,
      0,
      1,
      true,
    );
  }
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
        (state.currentMeasure -
          midi.header.ticksToMeasures(
            lastStar?.ticks ?? lastRevStar?.ticks ?? 0,
          )) /
          starSwitch,
      ) % 2;
    for (let x = 0; x <= starDivs; x++) {
      for (let y = 0; y <= starDivs; y++) {
        const xPos = -starSize / 2 + cellSize * x;
        const yPos = -starSize / 2 + cellSize * y;
        if ((x + y) % 2 === invert) {
          // @ts-expect-error p5.ts is broken
          tempGraphics.blendMode(p.REMOVE);
          tempGraphics.rect(
            xPos - starPadding,
            yPos - starPadding,
            cellSize + starPadding * 2,
            cellSize + starPadding * 2,
          );
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
