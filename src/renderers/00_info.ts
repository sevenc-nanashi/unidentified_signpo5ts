import p5 from "p5";
import { State } from "../state.ts";
import { smallFont } from "../const.ts";
import { useRendererContext } from "../utils.ts";

const drawLine = false;
const drawFps = false;
const numVLines = 9;
const numHLines = 9;
export const draw = import.meta.hmrify((p: p5, state: State) => {
  using _context = useRendererContext(p);
  if (drawLine) {
    for (let i = 0; i < numVLines; i++) {
      const x = (i + 1) * (p.width / (numVLines + 1));
      p.stroke(255, 100);
      p.line(x, 0, x, p.height);
    }
    for (let i = 0; i < numHLines; i++) {
      const y = (i + 1) * (p.height / (numHLines + 1));
      p.stroke(255, 100);
      p.line(0, y, p.width, y);
    }
  }

  if (drawFps) {
    p.fill(255);
    p.noStroke();
    p.textSize(16);
    p.textFont(smallFont);
    p.text("FPS: " + p.frameRate().toFixed(2), 10, 20);
  }
});
