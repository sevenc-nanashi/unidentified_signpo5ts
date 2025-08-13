import type p5 from "p5";
import chords from "../assets/chord.png";
import { dotUnit, height, smallFont } from "../const";
import { easeOutQuint } from "../easing";
import timelineMid from "../assets/timeline.mid?mid";
import type { State } from "../state";
import { resizeWithAspectRatio, useRendererContext } from "../utils";
import { Note } from "@tonejs/midi/dist/Note";

const baseMidi = 60;

const chordTrack = timelineMid.tracks.find((track) => track.name === "chord")!;

let chordImage: p5.Image;

export const preload = import.meta.hmrify((p: p5) => {
  chordImage = p.loadImage(chords);
});

// 720/250/535
const allWidth = 480;
const innerWidth = (535 / 720) * allWidth;
const partWidth = (250 / 720) * allWidth;
const leftPadding = ((720 - 535) / 2 / 720) * allWidth;
const imageTopPadding = 80;
const rowHeight = 160;
const lineHeight = 80;

const animationWidth = 4;
const animationDuration = 0.5;

const baseBottomPadding = dotUnit * 12;
const yShift = dotUnit * 8;

export const draw = import.meta.hmrify((p: p5, state: State) => {
  if (!chordImage) {
    preload(p);
    return;
  }
  using _context = useRendererContext(p);
  const activeChord = chordTrack.notes.findLast(
    (note) =>
      state.currentTick >= note.ticks &&
      state.currentTick < note.ticks + note.durationTicks,
  );
  if (!activeChord) return;

  const inactiveOverride = chordTrack.notes.find(
    (note) =>
      note.ticks <= state.currentTick &&
      state.currentTick < note.ticks + note.durationTicks &&
      note.midi === baseMidi - 1,
  );
  if (inactiveOverride) return;

  const index = activeChord.midi - baseMidi;

  const currentTick = state.currentTick;
  const progress =
    (currentTick - activeChord.ticks) / activeChord.durationTicks;

  const baseX = p.width / 2 - allWidth / 2;
  const isHalf = activeChord.velocity <= 0.5;
  const drawHeight = resizeWithAspectRatio(
    {
      width: chordImage.width,
      height: rowHeight,
    },
    {
      width: allWidth,
      height: "here",
    },
  );

  const isContinued =
    chordTrack.notes.some(
      (note) => note.ticks + note.durationTicks === activeChord.ticks,
    ) &&
    !chordTrack.notes.some(
      (note) =>
        note.ticks + note.durationTicks === activeChord.ticks &&
        note.midi === baseMidi - 1,
    );
  drawProgressLine();
  drawChordImage(activeChord);
  drawChordText();

  function drawChordImage(activeChord: Note) {
    using _context = useRendererContext(p);
    let animationProgress = 1;
    if (!isContinued) {
      animationProgress = p.map(
        state.currentTime,
        activeChord.time,
        activeChord.time + animationDuration,
        0,
        1,
        true,
      );
    }

    p.tint(255, 255 * easeOutQuint(animationProgress));
    p.drawingContext.shadowColor = "#444f";
    p.drawingContext.shadowBlur = dotUnit;
    if (isHalf) {
      p.translate(innerWidth - partWidth - partWidth / 2, 0);
    }

    p.image(
      chordImage,
      baseX - animationWidth * (1 - easeOutQuint(animationProgress)),
      p.height -
        baseBottomPadding -
        yShift -
        drawHeight +
        imageTopPadding * (drawHeight / rowHeight),
      allWidth,
      drawHeight,
      0,
      rowHeight * index + imageTopPadding,
      chordImage.width,
      rowHeight,
    );
  }

  function drawChordText() {
    using _context = useRendererContext(p);
    const firstChord = chordTrack.notes[0];
    p.textAlign(p.LEFT, p.CENTER);
    p.textSize(dotUnit * 6);
    p.textFont(smallFont);

    let animationProgress = [
      p.map(
        state.currentTime,
        firstChord.time,
        firstChord.time + animationDuration,
        -1,
        0,
        true,
      ),
      p.map(
        state.currentTime,
        firstChord.time + firstChord.duration,
        firstChord.time + firstChord.duration + animationDuration,
        0,
        1,
        true,
      ),
    ].reduce((a, b) => (Math.abs(a) > Math.abs(b) ? a : b), 0);
    if (Math.abs(animationProgress) >= 1) {
      return;
    }

    if (animationProgress < 0) {
      p.fill(255, 255, 255, 255 * easeOutQuint(1 + animationProgress));
    } else {
      p.fill(255, 255, 255, 255 * (1 - Math.abs(animationProgress)));
    }
    p.text(
      "Chords:",
      baseX +
        leftPadding +
        animationWidth *
          Math.sign(animationProgress) *
          (animationProgress < 0 ? 1 - easeOutQuint(1 + animationProgress) : 0),
      height -
        baseBottomPadding -
        yShift -
        drawHeight +
        imageTopPadding * (drawHeight / rowHeight) -
        dotUnit * 2,
    );
  }

  function drawProgressLine() {
    using _context = useRendererContext(p);
    p.stroke(255, 128);
    p.strokeWeight(dotUnit / 2);
    p.noFill();

    const lineY =
      p.height -
      baseBottomPadding -
      yShift -
      drawHeight +
      imageTopPadding * (drawHeight / rowHeight);

    let x: number;
    if (isHalf) {
      x = p.lerp(
        p.width / 2 - partWidth / 2,
        p.width / 2 + partWidth / 2,
        progress,
      );
    } else {
      if (progress < 0.5) {
        x = p.map(
          progress,
          0,
          0.5,
          baseX + leftPadding,
          baseX + partWidth + leftPadding,
        );
      } else {
        x = p.map(
          progress,
          0.5,
          1,
          baseX + allWidth - partWidth - leftPadding,
          baseX + allWidth - leftPadding,
        );
      }
    }

    p.line(x, lineY + drawHeight / 4, x, lineY + drawHeight * (3 / 4));
    return isHalf;
  }
});
