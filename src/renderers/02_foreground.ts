import type p5 from "p5";
import { sort } from "pixelsort";
import { dotUnit, reiColor, tycColor } from "../const";
import { easeInQuint, easeOutQuint, lerp } from "../easing";
import { loadTimelineWithText } from "../midi";
import commonVert from "../shaders/common.vert?raw";
import timelineMid, {
  rawMidi as timelineRawMid,
} from "../assets/timeline.mid?mid";
import type { State } from "../state";
import { resizeWithAspectRatio, saturate, useRendererContext } from "../utils";
import foregroundFrag from "../shaders/foreground.frag?raw";
import Rand from "rand-seed";

const imageSwitchMid = 60;
const alphaInMid = 59;
const pixelsortOutMid = 58;
const pixelsortInMid = 57;
const pixelsortMid = 56;
const glitchMid = 55;
const dimMid = 54;

const maxShift = 1;

const foregroundTrack = loadTimelineWithText(
  "foregrounds",
  timelineMid,
  timelineRawMid,
  {
    midis: [imageSwitchMid],
  },
);

const images = import.meta.glob("../assets/foregrounds/*.{png,jpg}", {
  eager: true,
}) as Record<string, { default: string }>;

const loadedImages: Record<string, p5.Image> = {};
let cpuGraphics: p5.Graphics;
let foregroundShader: p5.Shader;
let mainGraphics: p5.Graphics;
let cpuTempGraphics: p5.Graphics;

export const preload = import.meta.hmrify((p: p5) => {
  for (const [path, image] of Object.entries(images)) {
    const filename = path.split("/").pop()!;
    if (import.meta.hot) {
      if (!import.meta.hot.data.loadedImages) {
        import.meta.hot.data.loadedImages = {};
      }
      if (!import.meta.hot.data.loadedImages[filename]) {
        import.meta.hot.data.loadedImages[filename] = p.loadImage(
          image.default,
        );
      }
      loadedImages[filename] = import.meta.hot.data.loadedImages[filename];
    } else {
      loadedImages[filename] = p.loadImage(image.default);
    }
  }
});

export const draw = import.meta.hmrify((p: p5, state: State) => {
  if (Object.keys(loadedImages).length === 0) {
    preload(p);
    return;
  }
  if (!foregroundShader) {
    foregroundShader = p.createShader(commonVert, foregroundFrag);
  }
  mainGraphics = import.meta.autoGraphics(
    p,
    "foregroundMain",
    p.width,
    p.height,
    p.WEBGL,
  );
  mainGraphics.shader(foregroundShader);
  cpuGraphics = import.meta.autoGraphics(
    p,
    "foregroundCpu",
    p.width,
    p.height,
    p.CPU,
  );
  cpuTempGraphics = import.meta.autoGraphics(
    p,
    "foregroundCpuTemp",
    p.width,
    p.height,
  );

  mainGraphics.clear();

  const currentTick = state.currentTick;
  const activeForegroundNote = foregroundTrack.track.notes.find(
    (note) =>
      note.ticks <= currentTick &&
      note.ticks + note.durationTicks > currentTick &&
      note.midi >= imageSwitchMid,
  );
  if (!activeForegroundNote) {
    return;
  }

  const sortNote = foregroundTrack.track.notes.find(
    (note) =>
      note.ticks <= currentTick &&
      note.ticks + note.durationTicks > currentTick &&
      [pixelsortInMid, pixelsortOutMid, pixelsortMid].includes(note.midi),
  );
  let foregroundTextEvent = foregroundTrack.texts.findLast(
    (text) => text.time <= activeForegroundNote.ticks,
  );
  if (!foregroundTextEvent) {
    throw new Error(
      `No foreground text event found for ticks ${activeForegroundNote.ticks}`,
    );
  }
  let foregroundName = foregroundTextEvent.text;

  if (activeForegroundNote && loadedImages[foregroundName]) {
    const shift = activeForegroundNote.midi - imageSwitchMid;
    cpuGraphics.clear();
    cpuGraphics.image(
      loadedImages[foregroundName],
      0,
      (maxShift - shift) * dotUnit,
      cpuGraphics.width,
      cpuGraphics.height,
      0,
      0,
      loadedImages[foregroundName].width,
      loadedImages[foregroundName].height,
      p.COVER,
    );
    const dimNote = foregroundTrack.track.notes.find(
      (note) =>
        note.ticks <= currentTick &&
        note.ticks + note.durationTicks > currentTick &&
        note.midi === dimMid,
    );
    if (dimNote) {
      cpuGraphics.background(0, 0, 0, 255 * dimNote.velocity);
    }

    const glitchNote = foregroundTrack.track.notes.find(
      (note) =>
        note.ticks <= currentTick &&
        note.ticks + note.durationTicks > currentTick &&
        note.midi === glitchMid,
    );
    if (glitchNote) {
      cpuTempGraphics.clear();
      const rand = new Rand(
        `${glitchNote.ticks}:${foregroundName}:${glitchNote.velocity}`,
      );
      for (let i = 0; i < Math.round(rand.next() * 15); i++) {
        const w = (rand.next() + 0.5) * 2 * 40 * glitchNote.velocity;
        const h = (rand.next() + 0.5) * 2 * 20 * glitchNote.velocity;
        const x = rand.next() * (cpuGraphics.width - w);
        const y = rand.next() * (cpuGraphics.height - h);
        cpuTempGraphics.image(
          cpuGraphics,
          x,
          y,
          w,
          h,
          rand.next() * (cpuGraphics.width - w),
          rand.next() * (cpuGraphics.height - h),
          w,
          h,
        );
      }
      cpuGraphics.image(
        cpuTempGraphics,
        0,
        0,
        cpuTempGraphics.width,
        cpuTempGraphics.height,
        0,
        0,
        cpuGraphics.width,
        cpuGraphics.height,
      );
    }

    if (sortNote) {
      cpuGraphics.loadPixels();
      cpuGraphics.noSmooth();
      const sortNoteProgress = Math.min(
        1,
        (currentTick - sortNote.ticks) / sortNote.durationTicks,
      );
      const sorted = sort(
        cpuGraphics.pixels as unknown as Uint8Array,
        cpuGraphics.width,
        cpuGraphics.height,
        -512 *
          (sortNote.midi === pixelsortMid
            ? sortNote.velocity
            : lerp(
                1 - sortNote.velocity,
                1,
                sortNote.midi === pixelsortInMid
                  ? easeInQuint(sortNoteProgress)
                  : easeInQuint(1 - sortNoteProgress),
              )),
      );
      for (let i = 0; i < sorted.length; i++) {
        cpuGraphics.pixels[i] = sorted[i];
      }
      cpuGraphics.updatePixels(0, 0, cpuGraphics.width, cpuGraphics.height);
    }

    foregroundShader.setUniform("u_resolution", [
      mainGraphics.width,
      mainGraphics.height,
    ]);
    foregroundShader.setUniform("u_texture", cpuGraphics);
    mainGraphics.quad(-1, -1, 1, -1, 1, 1, -1, 1);
  }

  const alphaNote = foregroundTrack.track.notes.find(
    (note) =>
      note.ticks <= currentTick &&
      note.ticks + note.durationTicks > currentTick &&
      note.midi === alphaInMid,
  );
  const alphaProgress = alphaNote
    ? Math.min(1, (currentTick - alphaNote.ticks) / alphaNote.durationTicks)
    : 1;
  p.tint(255, 255 * easeOutQuint(alphaProgress));
  p.noSmooth();
  p.image(mainGraphics, 0, 0, p.width, p.height);
});
