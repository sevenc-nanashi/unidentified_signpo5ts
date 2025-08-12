import p5 from "p5";
import { State } from "../state.ts";
import { dotUnit, height } from "../const.ts";
import { useRendererContext } from "../utils.ts";
import { drumDefinition } from "../drum.ts";
import { midi } from "../midi.ts";
import { easeOutQuint } from "../easing.ts";

const size = height * 0.35;
const expand = size * 0.1;
const effect = height * 0.15;
const expandDuration = 0.25;
const effectDuration = 1;
export const draw = import.meta.hmrify((p: p5, state: State) => {
  const graphics = import.meta.autoGraphics(p, "square", p.width, p.height);

  let currentSize = size;
  using _context = useRendererContext(graphics);
  graphics.clear();
  graphics.translate(p.width / 2, p.height / 2);
  graphics.rectMode(p.CENTER);
  graphics.noSmooth();
  graphics.stroke(255);
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

  graphics.stroke(255);
  graphics.strokeWeight(dotUnit * 2);
  graphics.noFill();

  graphics.rect(0, 0, currentSize, currentSize);

  p.image(graphics, 0, 0, p.width, p.height);
});
