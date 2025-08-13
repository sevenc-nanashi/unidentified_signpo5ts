import { Note } from "@tonejs/midi/dist/Note";
import type p5 from "p5";
import { colors, dotUnit, frameRate } from "../const.ts";
import { easeOutQuint } from "../easing";
import midi from "../assets/main.mid?mid";
import type { State } from "../state";
import { cymbal, drumDefinition } from "../drum.ts";
import {
  ExhaustiveError,
  gcd,
  lcm,
  rationalize,
  saturate,
  useRendererContext,
} from "../utils.ts";
import { characterMidi, characterTimeline } from "../tracks.ts";
import { match, P } from "ts-pattern";

const subDrum = midi.tracks.find((track) => track.name === "RVK-808")!;

const cymbalWidth = dotUnit * 6;
const cymbalPadding = dotUnit * 1;
const cymbalWidthPadded = cymbalWidth + cymbalPadding;
const cymbalSeparatorWidth = dotUnit * 1;
export const cellWidth = dotUnit * 12;
export const cellHeight = cellWidth;
const cellPadding = dotUnit * 3;
const cellSectionSize = cellWidth * 8 + cellPadding * 7 + dotUnit * 2;

const dividePadding = 2;

type SliceType =
  | "1/1"
  | "1/2"
  | "2/2"
  | "1/3"
  | "2/3"
  | "3/3"
  | "1/4"
  | "2/4"
  | "3/4"
  | "4/4";
export const drawRects = {
  "1/1": {
    x: -dotUnit,
    y: -dotUnit,
    width: dotUnit + cellWidth + dotUnit,
    height: dotUnit + cellHeight + dotUnit,
  },
  "1/2": {
    x: -dotUnit,
    y: -dotUnit,
    width: dotUnit + cellWidth / 2 - dividePadding / 2,
    height: cellHeight + dotUnit * 2,
  },
  "2/2": {
    x: cellWidth / 2 + dividePadding / 2,
    y: -dotUnit,
    width: dividePadding / 2 + cellWidth / 2 + dotUnit,
    height: cellHeight + dotUnit * 2,
  },
  "1/3": {
    x: -dotUnit,
    y: -dotUnit,
    width: dotUnit + cellWidth / 3 - dividePadding / 2,
    height: cellHeight + dotUnit * 2,
  },
  "2/3": {
    x: cellWidth / 3 + dividePadding / 2,
    y: -dotUnit,
    width: cellWidth / 3 - dividePadding,
    height: cellHeight + dotUnit * 2,
  },
  "3/3": {
    x: (cellWidth * 2) / 3 + dividePadding / 2,
    y: -dotUnit,
    width: cellWidth / 3 - dividePadding / 2 + dotUnit,
    height: cellHeight + dotUnit * 2,
  },
  "1/4": {
    x: -dotUnit,
    y: -dotUnit,
    width: dotUnit + cellWidth / 2 - dividePadding / 2,
    height: dotUnit + cellHeight / 2 - dividePadding / 2,
  },
  "2/4": {
    x: cellWidth / 2 + dividePadding / 2,
    y: -dotUnit,
    width: dividePadding / 2 + cellWidth / 2 + dotUnit,
    height: dotUnit + cellHeight / 2 - dividePadding / 2,
  },
  "3/4": {
    x: -dotUnit,
    y: cellHeight / 2 + dividePadding / 2,
    width: dotUnit + cellWidth / 2 - dividePadding / 2,
    height: dividePadding / 2 + cellHeight / 2 + dotUnit,
  },
  "4/4": {
    x: cellWidth / 2 + dividePadding / 2,
    y: cellHeight / 2 + dividePadding / 2,
    width: dividePadding / 2 + cellWidth / 2 + dotUnit,
    height: dividePadding / 2 + cellHeight / 2 + dotUnit,
  },
} satisfies Record<
  SliceType,
  { x: number; y: number; width: number; height: number }
>;

export const drumVisualizerWidth =
  cymbalWidthPadded * 2 + cellSectionSize + cymbalSeparatorWidth * 2;
export const drumVisualizerHeight = cellHeight + dotUnit * 2;
export const drumVisualizer = (
  graphics: p5,
  tempGraphics: p5.Graphics,
  state: State,
  activateNote: Note,
) => {
  graphics.noStroke();

  drawBeatGrid(state, graphics);

  drawCymbal(activateNote, state, graphics);

  const drums = collectDrums(state, activateNote, 2);
  const flatDrums = flattenDrums(drums);
  const groupedDrums = groupedDrumsByType(flatDrums);

  for (const [note, noteType] of groupedDrums) {
    if (note.ticks > state.currentTick) {
      continue;
    }

    const numBeats = getNumBeats(note.ticks);
    const measure = midi.header.ticksToMeasures(note.ticks);
    const measureDivision =
      Math.floor((measure % 1) * numBeats + 0.00001) + (8 - numBeats);
    const sliceType = getSliceType(note, flatDrums);
    const x =
      -cymbalWidthPadded -
      cymbalSeparatorWidth -
      cellSectionSize +
      measureDivision * cellWidth +
      measureDivision * cellPadding +
      dotUnit;
    let y = -cellHeight;
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
      : ([192, 192, 192] as const);
    using _context = useRendererContext(tempGraphics);
    tempGraphics.clear();
    tempGraphics.noStroke();
    tempGraphics.noSmooth();
    tempGraphics.noFill();
    tempGraphics.translate(dotUnit, dotUnit);
    // tempGraphics.background(128);
    drawDrumUnit(
      tempGraphics,
      state,
      noteType,
      measure,
      primaryColor,
      saturation,
      alpha,
    );
    graphics.image(
      tempGraphics,
      x + drawRects[sliceType].x,
      y + drawRects[sliceType].y,
      drawRects[sliceType].width,
      drawRects[sliceType].height,
      drawRects[sliceType].x + dotUnit,
      drawRects[sliceType].y + dotUnit,
      drawRects[sliceType].width,
      drawRects[sliceType].height,
    );
  }
};
type DrumCollection = {
  shootingStar: Note | undefined;
  claps: Note[];
  kicks: Note[];
  snares: Note[];
  hihats: Note[];
  openHihats: Note[];
};
type DrumType = "kick" | "snare" | "clap" | "hihat" | "openHihat" | "star";
type CellType = "star+kick" | "kick+snare" | "kick+clap" | DrumType;

type GroupedDrum = [Note, DrumType];
type DrumCell = [Note, CellType];
export function collectDrums(
  state: State,
  activateNote: Note,
  prevExpand: number,
): DrumCollection {
  let shootingStar: Note | undefined;
  const kicks: Note[] = [];
  const snares: Note[] = [];
  const hihats: Note[] = [];
  const openHihats: Note[] = [];
  const claps: Note[] = [];

  const currentMeasure = state.currentMeasure;
  const startMeasure = Math.max(0, Math.floor(currentMeasure) - prevExpand);
  const endMeasure = Math.floor(currentMeasure) + 1;
  for (const [track, definition] of drumDefinition) {
    for (const note of track.notes) {
      const measure = midi.header.ticksToMeasures(note.ticks);
      if (
        measure >= startMeasure &&
        measure < endMeasure &&
        note.ticks >= activateNote.ticks
      ) {
        if (note.midi === definition.kick) {
          kicks.push(note);
        } else if (note.midi === definition.snare) {
          snares.push(note);
        } else if (note.midi === definition.hihat) {
          hihats.push(note);
        } else if (note.midi === definition.openHihat) {
          openHihats.push(note);
        } else if (note.midi === definition.clap) {
          claps.push(note);
        } else if (note.midi === definition.star) {
          shootingStar = note;
        }
      }
    }
  }
  return {
    shootingStar,
    claps,
    kicks,
    snares,
    hihats,
    openHihats,
  };
}

export function drawBeatGrid(state: State, graphics: p5) {
  const currentTimeSignature = midi.header.timeSignatures.findLast(
    (v) => v.ticks <= state.currentTick,
  )!;
  const beats =
    (currentTimeSignature.timeSignature[0] /
      currentTimeSignature.timeSignature[1]) *
    8;
  for (let i = 0; i <= 8; i++) {
    graphics.fill(255, i % beats === 0 ? 255 : i > beats ? 64 : 128);
    let heightLevel = 0.5;
    if (i % 2 === 1) {
      heightLevel *= 0.5;
    }
    if (i % beats === 0) {
      heightLevel = 1;
    } else if (i > beats) {
      heightLevel *= 0.75;
    }
    const height = drumVisualizerHeight * heightLevel;

    graphics.rect(
      -cymbalWidthPadded -
        cymbalSeparatorWidth -
        i * cellWidth -
        i * cellPadding,
      -height,
      dotUnit,
      height,
    );
  }
}

export function drawCymbal(activateNote: Note, state: State, graphics: p5) {
  const lastCymbal = [
    subDrum.notes.findLast(
      (note) =>
        note.ticks >= activateNote.ticks &&
        note.ticks <= state.currentTick &&
        note.midi === 50,
    ),
    cymbal.notes.findLast(
      (note) =>
        note.ticks >= activateNote.ticks && note.ticks <= state.currentTick,
    ),
  ]
    .filter((note) => note !== undefined)
    .toSorted((a, b) => a!.ticks - b!.ticks)
    .at(-1)!;
  if (lastCymbal) {
    const cymbalTime = midi.header.ticksToSeconds(lastCymbal.ticks);
    const currentTime = state.currentFrame / frameRate;
    graphics.fill(
      255,
      Math.max(0, 255 - (255 * (currentTime - cymbalTime)) / 1),
    );
    const widthFactor = lastCymbal.midi === 49 ? 1 : 0.5;
    graphics.rect(
      -drumVisualizerWidth + cymbalWidth * (1 - widthFactor),
      -drumVisualizerHeight,
      cymbalWidth * widthFactor,
      drumVisualizerHeight,
    );
    graphics.rect(
      -cymbalWidth,
      -drumVisualizerHeight,
      cymbalWidth * widthFactor,
      drumVisualizerHeight,
    );
  }
}

export function drawDrumUnit(
  tempGraphics: p5.Graphics,
  state: State,
  cellType: CellType,
  measure: number,
  primaryColor: readonly [number, number, number],
  saturation: number,
  alpha: number,
) {
  const progress = Math.min((state.currentMeasure - measure) * 16, 1);
  const borderColor = [
    ...saturate(primaryColor, saturation),
    alpha * progress,
  ] as [number, number, number, number];
  const mainColor = [
    ...saturate(primaryColor, saturation * 0.7 + 0.3),
    alpha * progress,
  ] as [number, number, number, number];
  tempGraphics.fill(...mainColor);
  switch (cellType) {
    case "star+kick": {
      const starHeight = cellHeight - dotUnit * 7;
      tempGraphics.rect(
        dotUnit * 5,
        dotUnit * 2 + starHeight * (1 - progress),
        cellWidth - dotUnit * 10,
        starHeight * progress,
      );
      tempGraphics.rect(
        dotUnit * 5,
        cellHeight - dotUnit * 4,
        cellWidth - dotUnit * 10,
        dotUnit * 2,
      );
      const height = cellHeight - dotUnit * 4;
      tempGraphics.rect(
        dotUnit * 2,
        dotUnit * 2 + height * (1 - progress),
        dotUnit * 2,
        height * progress,
      );
      tempGraphics.rect(
        cellWidth - dotUnit * 4,
        dotUnit * 2 + height * (1 - progress),
        dotUnit * 2,
        height * progress,
      );
      break;
    }
    case "kick": {
      const height = cellHeight - dotUnit * 4;
      tempGraphics.rect(
        dotUnit * 2,
        dotUnit * 2 + height * (1 - progress),
        cellWidth - dotUnit * 4,
        height * progress,
      );
      break;
    }
    case "kick+snare": {
      const width = cellWidth - dotUnit * 4;
      tempGraphics.rect(
        dotUnit * 2,
        dotUnit * 2,
        width * progress,
        (cellHeight - dotUnit * 6) / 3,
      );
      tempGraphics.rect(
        dotUnit * 2 + (width / 2) * (1 - progress),
        dotUnit * 2 + (cellHeight - dotUnit * 6) / 3 + dotUnit,
        (width / 2) * progress,
        (cellHeight - dotUnit * 6) / 3,
      );
      tempGraphics.rect(
        dotUnit * 2 + width / 2,
        dotUnit * 2 + (cellHeight - dotUnit * 6) / 3 + dotUnit,
        (width / 2) * progress,
        (cellHeight - dotUnit * 6) / 3,
      );
      tempGraphics.rect(
        dotUnit * 2 + width * (1 - progress),
        dotUnit * 2 + (cellHeight - dotUnit * 6) * (2 / 3) + dotUnit * 2,
        width * progress,
        (cellHeight - dotUnit * 6) / 3,
      );
      break;
    }
    case "snare": {
      const width = cellWidth - dotUnit * 4;
      tempGraphics.rect(
        dotUnit * 2,
        dotUnit * 2,
        width * progress,
        (cellHeight - dotUnit * 5) / 2,
      );
      tempGraphics.rect(
        dotUnit * 2 + width * (1 - progress),
        dotUnit * 2 + (cellHeight - dotUnit * 5) / 2 + dotUnit,
        width * progress,
        (cellHeight - dotUnit * 5) / 2,
      );
      break;
    }
    case "kick+clap": {
      const height = cellHeight - dotUnit * 4;
      tempGraphics.rect(
        dotUnit * 2,
        dotUnit * 2,
        (cellWidth - dotUnit * 6) / 3,
        height * progress,
      );
      tempGraphics.rect(
        dotUnit * 2 + (cellWidth - dotUnit * 6) / 3 + dotUnit,
        dotUnit * 2 + (height / 2) * (1 - progress),
        (cellWidth - dotUnit * 6) / 3,
        (height / 2) * progress,
      );
      tempGraphics.rect(
        dotUnit * 2 + (cellWidth - dotUnit * 6) / 3 + dotUnit,
        dotUnit * 2 + height / 2,
        (cellWidth - dotUnit * 6) / 3,
        (height / 2) * progress,
      );
      tempGraphics.rect(
        dotUnit * 2 + (cellWidth - dotUnit * 6) * (2 / 3) + dotUnit * 2,
        dotUnit * 2 + height * (1 - progress),
        (cellWidth - dotUnit * 6) / 3,
        height * progress,
      );

      break;
    }
    case "clap": {
      const height = cellHeight - dotUnit * 4;
      tempGraphics.rect(
        dotUnit * 2,
        dotUnit * 2,
        (cellWidth - dotUnit * 5) / 2,
        height * progress,
      );
      tempGraphics.rect(
        dotUnit * 2 + (cellWidth - dotUnit * 5) / 2 + dotUnit,
        dotUnit * 2 + height * (1 - progress),
        (cellWidth - dotUnit * 5) / 2,
        height * progress,
      );
      break;
    }
    case "hihat": {
      tempGraphics.fill(...borderColor);
      tempGraphics.rect(0, 0, cellWidth, dotUnit);
      tempGraphics.rect(0, 0, dotUnit, cellHeight);
      tempGraphics.rect(cellWidth - dotUnit, 0, dotUnit, cellHeight);
      tempGraphics.rect(0, cellHeight - dotUnit, cellWidth, dotUnit);
      break;
    }
    case "openHihat": {
      tempGraphics.fill(...borderColor);
      const partWidth = (cellWidth - dotUnit) / 2;
      const partHeight = (cellHeight - dotUnit) / 2;
      tempGraphics.rect(0, 0, partWidth * progress, dotUnit);
      tempGraphics.rect(0, 0, dotUnit, partHeight * progress);
      tempGraphics.rect(
        0,
        cellHeight - partHeight * progress,
        dotUnit,
        partHeight * progress,
      );
      tempGraphics.rect(0, cellHeight - dotUnit, partWidth * progress, dotUnit);
      tempGraphics.rect(
        cellWidth - partWidth * progress,
        0,
        partWidth * progress,
        dotUnit,
      );
      tempGraphics.rect(cellWidth - dotUnit, 0, dotUnit, partHeight * progress);
      tempGraphics.rect(
        cellWidth - partWidth,
        cellHeight - dotUnit,
        partWidth * progress,
        dotUnit,
      );
      tempGraphics.rect(
        cellWidth - dotUnit,
        cellHeight - partHeight,
        dotUnit,
        partHeight * progress,
      );

      break;
    }
    default: {
      throw new ExhaustiveError(cellType);
    }
  }
}

export function flattenDrums(drums: DrumCollection): GroupedDrum[] {
  return [
    drums.shootingStar && ([drums.shootingStar, "star"] as GroupedDrum),
    ...drums.claps.map((note): GroupedDrum => [note, "clap"]),
    ...drums.kicks.map((note): GroupedDrum => [note, "kick"]),
    ...drums.snares.map((note): GroupedDrum => [note, "snare"]),
    ...drums.hihats.map((note): GroupedDrum => [note, "hihat"]),
    ...drums.openHihats.map((note): GroupedDrum => [note, "openHihat"]),
  ]
    .filter((drum) => drum !== undefined)
    .toSorted((a, b) => a[0].ticks - b[0].ticks);
}
export function groupedDrumsByType(flatDrums: GroupedDrum[]): DrumCell[] {
  const ticks = new Map<
    number,
    {
      star: Note | undefined;
      kick: Note | undefined;
      snare: Note | undefined;
      clap: Note | undefined;
      hihat: Note | undefined;
      openHihat: Note | undefined;
    }
  >();
  for (const [note, type] of flatDrums) {
    if (!ticks.has(note.ticks)) {
      ticks.set(note.ticks, {
        star: undefined,
        kick: undefined,
        snare: undefined,
        clap: undefined,
        hihat: undefined,
        openHihat: undefined,
      });
    }
    const current = ticks.get(note.ticks)!;
    current[type] = note;
  }

  const result: DrumCell[] = [...ticks.values()]
    .flatMap((drum) => [
      match(drum)
        .with(
          { star: P.nonNullable.select(), kick: P.nonNullable },
          (star): DrumCell => [star, "star+kick"],
        )
        .with(
          { kick: P.nonNullable.select(), clap: P.nonNullable },
          (kick): DrumCell => [kick, "kick+clap"],
        )
        .with(
          { kick: P.nonNullable.select(), snare: P.nonNullable },
          (kick): DrumCell => [kick, "kick+snare"],
        )
        .with(
          { kick: P.nonNullable.select() },
          (kick): DrumCell => [kick, "kick"],
        )
        .with(
          { snare: P.nonNullable.select() },
          (snare): DrumCell => [snare, "snare"],
        )
        .with(
          { clap: P.nonNullable.select() },
          (clap): DrumCell => [clap, "clap"],
        )
        .with(P.any, () => undefined)
        .run(),
      match(drum)
        .with(
          { openHihat: P.nonNullable.select() },
          (openHihat): DrumCell => [openHihat, "openHihat"],
        )
        .with(
          { hihat: P.nonNullable.select() },
          (hihat): DrumCell => [hihat, "hihat"],
        )
        .with(P.any, () => undefined)
        .run(),
    ])
    .filter((cell): cell is DrumCell => cell !== undefined);

  return result;
}

const quantize = midi.header.ppq / 2;
export function getSliceType(note: Note, flatDrums: GroupedDrum[]): SliceType {
  const drumsInBeat = flatDrums.filter(
    ([drum]) =>
      Math.floor(drum.ticks / quantize) === Math.floor(note.ticks / quantize),
  );
  const rationalized = drumsInBeat.map(([drum]) => {
    const ticks = drum.ticks % quantize;
    return rationalize(ticks, quantize);
  });
  const numDrumsInBeat = rationalized.reduce(
    (prev, curr) => lcm(prev, curr[1]),
    1,
  );
  const index = Math.round(
    ((note.ticks % quantize) / quantize) * numDrumsInBeat,
  );

  return `${index + 1}/${numDrumsInBeat}` as SliceType;
}

export function getNumBeats(ticks: number): number {
  const noteTimeSignature = midi.header.timeSignatures.findLast(
    (v) => v.ticks <= ticks,
  )!;
  const beats =
    (noteTimeSignature.timeSignature[0] / noteTimeSignature.timeSignature[1]) *
    8;
  return Math.round(beats);
}
