import p5 from "p5";
import { State } from "../state.ts";
import { drumVisualizer } from "../components/drumVisualizer.ts";
import { dotUnit, mainFont, smallFont } from "../const.ts";
import timeline from "../assets/timeline.mid?mid";
import { useRendererContext } from "../utils.ts";

const visualizerTimeline = timeline.tracks.find(
  (track) => track.name === "visualizer",
)!;

const activateMidi = 60;
const padding = dotUnit * 12;
const cornerSize = dotUnit * 32;
const cornerPadding = dotUnit * 8;

let mainGraphics: p5.Graphics;

export const draw = import.meta.hmrify((p: p5, state: State) => {
  mainGraphics = import.meta.autoGraphics(
    p,
    "visualizerMain",
    p.width,
    p.height,
  );
  mainGraphics.textFont(mainFont);
  mainGraphics.textAlign(mainGraphics.CENTER, mainGraphics.CENTER);
  mainGraphics.textSize(dotUnit * 6);
  mainGraphics.clear();

  const tempGraphics = import.meta.autoGraphics(
    p,
    "visualizerTemp",
    dotUnit * 32,
    dotUnit * 32,
  );

  const activateNote = visualizerTimeline.notes.find(
    (note) =>
      note.ticks <= state.currentTick &&
      state.currentTick < note.ticks + note.durationTicks &&
      note.midi === activateMidi,
  );
  if (!activateNote) return;
  using _context = useRendererContext(mainGraphics);
  drawFrames(p);
  drawTexts(state);
  {
    using _context = useRendererContext(mainGraphics);
    mainGraphics.translate(
      mainGraphics.width - padding - cornerPadding,
      mainGraphics.height - padding - cornerPadding,
    );
    mainGraphics.drawingContext.shadowColor = "transparent";
    drumVisualizer(mainGraphics, tempGraphics, state, activateNote);
  }
  {
    using _context = useRendererContext(p);
    p.drawingContext.shadowColor = "#444f";
    p.drawingContext.shadowBlur = dotUnit;
    p.image(mainGraphics, 0, 0, p.width, p.height);
  }
});

if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => {
    mainGraphics?.remove();
  });
}

function drawTexts(state: State) {
  mainGraphics.textFont(smallFont);
  mainGraphics.textSize(dotUnit * 8);
  mainGraphics.fill(255);
  {
    using _context = useRendererContext(mainGraphics);
    mainGraphics.textAlign(mainGraphics.LEFT, mainGraphics.BOTTOM);
    mainGraphics.text(
      [
        `${Math.floor(state.currentMeasure)
          .toString()
          .padStart(
            2,
          )}.${(Math.floor(state.currentMeasure * 4) % 4) + 1}.${Math.floor(
          (state.currentMeasure * 400) % 100,
        )
          .toString()
          .padStart(2, "0")}`,
        `${Math.floor(state.currentTime / 60)}:${String(
          Math.floor(state.currentTime % 60),
        ).padStart(2, "0")}.${String(
          Math.floor((state.currentTime % 1) * 100),
        ).padStart(2, "0")}`,
      ].join(" | "),
      padding + cornerPadding,
      mainGraphics.height - padding - cornerPadding,
    );
  }
}

function drawFrames(p: p5) {
  {
    using _context = useRendererContext(mainGraphics);
    mainGraphics.stroke(255);
    mainGraphics.strokeWeight(dotUnit);
    mainGraphics.noFill();
    mainGraphics.line(padding, padding, padding + cornerSize, padding);
    mainGraphics.line(padding, padding, padding, padding + cornerSize);
    mainGraphics.line(
      p.width - padding,
      padding,
      p.width - padding - cornerSize,
      padding,
    );
    mainGraphics.line(
      p.width - padding,
      padding,
      p.width - padding,
      padding + cornerSize,
    );
    mainGraphics.line(
      padding,
      p.height - padding,
      padding + cornerSize,
      p.height - padding,
    );
    mainGraphics.line(
      padding,
      p.height - padding,
      padding,
      p.height - padding - cornerSize,
    );
    mainGraphics.line(
      p.width - padding,
      p.height - padding,
      p.width - padding - cornerSize,
      p.height - padding,
    );
    mainGraphics.line(
      p.width - padding,
      p.height - padding,
      p.width - padding,
      p.height - padding - cornerSize,
    );
  }
}
