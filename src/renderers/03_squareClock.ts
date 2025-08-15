import p5 from "p5";
import { State } from "../state.ts";
import { dotUnit, height, smallFont } from "../const.ts";
import { state as capturerState } from "p5-frame-capturer";
import { useRendererContext } from "../utils.ts";
import timeline from "../assets/timeline.mid?mid";
import { midi } from "../midi.ts";

const visualizerTimeline = timeline.tracks.find(
  (track) => track.name === "visualizer",
)!;
const activateMidi = 63;
const ballActivateMidi = 64;
const secondBallActivateMidi = 65;
const radius = 150 * dotUnit;
export const draw = import.meta.hmrify((p: p5, state: State) => {
  const activateNote = visualizerTimeline.notes.find(
    (note) =>
      note.ticks <= state.currentTick &&
      state.currentTick < note.ticks + note.durationTicks &&
      note.midi === activateMidi,
  );
  if (!activateNote) return;
  const ballActivateNote = visualizerTimeline.notes.find(
    (note) =>
      note.ticks <= state.currentTick &&
      state.currentTick < note.ticks + note.durationTicks &&
      note.midi === ballActivateMidi,
  );
  const secondBallActivateNote = visualizerTimeline.notes.find(
    (note) =>
      note.ticks <= state.currentTick &&
      state.currentTick < note.ticks + note.durationTicks &&
      note.midi === secondBallActivateMidi,
  );

  const graphics = import.meta.autoGraphics(
    p,
    "squareClock",
    Math.floor(p.width / dotUnit),
    Math.floor(p.height / dotUnit),
  );

  using _context = useRendererContext(graphics);
  graphics.clear();
  graphics.translate(graphics.width / 2, graphics.height / 2);
  graphics.scale(1 / dotUnit);
  graphics.noSmooth();
  graphics.noFill();
  graphics.stroke(255, 255, 255, 128);
  graphics.strokeWeight(dotUnit);

  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 2) * (i - 1);
    const angle2 = (Math.PI / 2) * i;
    const x = Math.cos(angle) * radius;
    const nx = Math.cos(angle2) * radius;
    const y = Math.sin(angle) * radius;
    const ny = Math.sin(angle2) * radius;
    graphics.line(x, y, nx, ny);

    if (ballActivateNote) {
      if (
        Math.floor(
          (state.currentMeasure -
            midi.header.ticksToMeasures(activateNote.ticks)) *
            4,
        ) %
          (secondBallActivateNote ? 2 : 4) ===
        (secondBallActivateNote ? i % 2 : i)
      ) {
        graphics.fill(255);
        const progress = (state.currentMeasure * 4) % 1;
        graphics.ellipse(
          p.map(progress % 1, 0, 1, x, nx),
          p.map(progress % 1, 0, 1, y, ny),
          dotUnit * 6,
          dotUnit * 6,
        );
      }
    }
  }

  using _context2 = useRendererContext(p);
  p.drawingContext.shadowColor = "#4448";
  p.drawingContext.shadowBlur = dotUnit * 2;
  p.tint(255, 128);
  p.noSmooth();
  p.image(graphics, 0, 0, p.width, p.height);
});
