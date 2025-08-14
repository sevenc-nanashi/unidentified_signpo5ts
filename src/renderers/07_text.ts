import type { Note } from "@tonejs/midi/dist/Note";
import type p5 from "p5";
import texts from "../assets/texts.txt?raw";
import type { State } from "../state";
import timelineMid, {
  rawMidi as timelineRawMid,
} from "../assets/timeline.mid?mid";
import { dim, toRgb, useRendererContext } from "../utils";
import { dotUnit, height, mainFont, reiColor, tycColor } from "../const";

const fg = [255, 255, 255] as const;
const textsTrack = timelineMid.tracks.find((track) => track.name === "texts")!;

const baseMidi = 60;

const textSections = texts
  .trim()
  .split("\n====\n")
  .map((section) => section.split("\n---\n"));

const font = "美咲ゴシック";
const shift = height * 0.3;

export const draw = import.meta.hmrify((p: p5, state: State) => {
  const currentNote = textsTrack.notes.find(
    (note) =>
      state.currentTick >= note.ticks &&
      state.currentTick < note.ticks + note.durationTicks &&
      note.midi >= baseMidi,
  );
  if (!currentNote) return;

  const index = currentNote.midi - baseMidi;
  if (index === -1) return;

  using _context = useRendererContext(p);

  const section = textSections[index];
  if (section) {
    const fontSize = dotUnit * 6;

    p.textSize(fontSize);
    p.textFont(font);
    p.noSmooth();
    p.fill(...fg);

    const textSizeFactor = 0.3;
    p.textLeading(fontSize * (1 + textSizeFactor));
    if (section.length === 1) {
      p.drawingContext.shadowBlur = dotUnit;

      p.drawingContext.shadowColor = "#444f";
      p.textAlign(p.CENTER, p.CENTER);
      p.text(section[0], p.width / 2, p.height * 0.5);
    } else {
      const leftSection = section[0];

      p.drawingContext.shadowBlur = dotUnit;

      p.drawingContext.shadowColor = toRgb(dim(tycColor, 0.7));
      p.textAlign(p.RIGHT, p.CENTER);
      p.text(leftSection, p.width / 2 - shift, p.height * 0.5);

      p.textAlign(p.LEFT, p.CENTER);
      const rightSection = section[1];
      p.drawingContext.shadowColor = toRgb(dim(reiColor, 0.7));
      p.text(rightSection, p.width / 2 + shift, p.height * 0.5);
    }
  }
});
