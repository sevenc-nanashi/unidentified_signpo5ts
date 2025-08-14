import type p5 from "p5";
import type { State } from "./state.ts";
import { bg } from "./const.ts";

const renderers = import.meta.glob("./renderers/*.ts", {
  eager: true,
}) as Record<
  string,
  { draw: (p: p5, state: State) => void; preload?: (p: p5) => void }
>;

let erroredLastFrame = false;
export const preload = import.meta.hmrify((p: p5) => {
  for (const renderer of Object.values(renderers)) {
    if (renderer.preload) {
      renderer.preload(p);
    }
  }
});
export const draw = import.meta.hmrify((p: p5, state: State) => {
  try {
    p.background(bg);
    p.noSmooth();

    for (const [path, { draw }] of Object.entries(renderers)) {
      p.push();
      draw(p, state);
      p.pop();
    }

    erroredLastFrame = false;
  } catch (e) {
    p.push();
    p.background([255, 0, 0, 250]);
    p.textSize(24);
    p.textAlign(p.LEFT, p.TOP);
    p.fill([255, 255, 255]);
    p.textFont("monospace");
    p.text(String(e), 32, 32);
    p.pop();
    if (!erroredLastFrame) {
      console.error(e);
    }
    erroredLastFrame = true;
  }
});
