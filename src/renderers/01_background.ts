import type p5 from "p5";
import { sort } from "pixelsort";
import { dotUnit, reiColor, tycColor } from "../const";
import { easeInQuint, easeOutQuint, lerp } from "../easing";
import { loadTimelineWithText } from "../midi";
import commonVert from "../shaders/common.vert?raw";
import backgroundFrag from "../shaders/background.frag?raw";
import timelineMid, {
  rawMidi as timelineRawMid,
} from "../assets/timeline.mid?mid";
import type { State } from "../state";
import { resizeWithAspectRatio, saturate, useRendererContext } from "../utils";
import Rand from "rand-seed";

const imageSwitchMid = 60;
const alphaInMid = 59;
const pixelsortOutMid = 58;
const pixelsortInMid = 57;
const pixelsortMid = 56;
const glitchMid = 55;
const dimMid = 54;
const waveOverrideMid = 53;

const backgroundTrack = loadTimelineWithText(
  "backgrounds",
  timelineMid,
  timelineRawMid,
  {
    midis: [imageSwitchMid],
  },
);

const images = import.meta.glob("../assets/backgrounds/*.{png,jpg}", {
  eager: true,
}) as Record<string, { default: string }>;

const loadedImages: Record<string, p5.Image> = {};
let pixelizeShader: p5.Shader;
let cpuGraphics: p5.Graphics;
let mainGraphics: p5.Graphics;
let cpuTempGraphics: p5.Graphics;

const particleMidi = 48;

let particleGraphics: p5.Graphics;

const particleInterval = 90;
const particleSpeed = 0.02;
const particleScale = 0.0005;
const colorScale = 0.00005;

const wave = 1;
const minusScale = 1 / 4;

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
  if (!pixelizeShader) {
    pixelizeShader = p.createShader(commonVert, backgroundFrag);
  }
  mainGraphics = import.meta.autoGraphics(
    p,
    "backgroundMain",
    p.width,
    p.height,
    p.WEBGL,
  );
  cpuGraphics = import.meta.autoGraphics(
    p,
    "backgroundCpu",
    p.width * minusScale,
    p.height * minusScale,
    p.CPU,
  );
  cpuTempGraphics = import.meta.autoGraphics(
    p,
    "backgroundCpuTemp",
    p.width * minusScale,
    p.height * minusScale,
  );
  mainGraphics.shader(pixelizeShader);

  mainGraphics.clear();

  const currentTick = state.currentTick;
  const activeBackgroundNote = backgroundTrack.track.notes.find(
    (note) =>
      note.ticks <= currentTick &&
      note.ticks + note.durationTicks > currentTick &&
      note.midi >= imageSwitchMid,
  );
  if (!activeBackgroundNote) {
    return;
  }

  const sortNote = backgroundTrack.track.notes.find(
    (note) =>
      note.ticks <= currentTick &&
      note.ticks + note.durationTicks > currentTick &&
      [pixelsortInMid, pixelsortOutMid, pixelsortMid].includes(note.midi),
  );

  let backgroundTextEvent = backgroundTrack.texts.findLast(
    (text) => text.time <= activeBackgroundNote.ticks,
  );
  if (!backgroundTextEvent) {
    throw new Error(
      `No background text event found for ticks ${activeBackgroundNote.ticks}`,
    );
  }
  let backgroundName = backgroundTextEvent.text;
  if (backgroundTextEvent.note.ticks !== activeBackgroundNote.ticks) {
    const suffix = backgroundName.match(/-([0-9]+)/);
    if (!suffix) {
      throw new Error(
        `No suffix found in background name "${backgroundName}" for ticks ${activeBackgroundNote.ticks}`,
      );
    }
    const suffixNumber = parseInt(suffix[1], 10);
    const newSuffix =
      suffixNumber + activeBackgroundNote.midi - backgroundTextEvent.note.midi;
    backgroundName = backgroundName.replace(
      /-[0-9]+/,
      `-${newSuffix.toString().padStart(suffix[1].length, "0")}`,
    );
  }

  if (activeBackgroundNote && loadedImages[backgroundName]) {
    cpuGraphics.clear();
    cpuGraphics.image(
      loadedImages[backgroundName],
      0,
      0,
      cpuGraphics.width,
      cpuGraphics.height,
      0,
      0,
      loadedImages[backgroundName].width,
      loadedImages[backgroundName].height,
      p.COVER,
    );
    const dimNote = backgroundTrack.track.notes.find(
      (note) =>
        note.ticks <= currentTick &&
        note.ticks + note.durationTicks > currentTick &&
        note.midi === dimMid,
    );
    if (dimNote) {
      cpuGraphics.background(0, 0, 0, 255 * dimNote.velocity);
    }

    const glitchNote = backgroundTrack.track.notes.find(
      (note) =>
        note.ticks <= currentTick &&
        note.ticks + note.durationTicks > currentTick &&
        note.midi === glitchMid,
    );
    if (glitchNote) {
      cpuTempGraphics.clear();
      const rand = new Rand(
        `${glitchNote.ticks}:${backgroundName}:${glitchNote.velocity}`,
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
        512 *
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
    pixelizeShader.setUniform("u_resolution", [
      mainGraphics.width,
      mainGraphics.height,
    ]);

    const waveOverrideNote = backgroundTrack.track.notes.find(
      (note) =>
        note.ticks <= currentTick &&
        note.ticks + note.durationTicks > currentTick &&
        note.midi === waveOverrideMid,
    );

    const currentMeasure = state.currentMeasure;
    pixelizeShader.setUniform(
      "u_wave",
      Math.sin(currentMeasure * Math.PI) *
        (waveOverrideNote
          ? waveOverrideNote.velocity * dotUnit * 4 + wave
          : wave) *
        minusScale,
    );
    pixelizeShader.setUniform("u_pixelSize", dotUnit / minusScale);
    pixelizeShader.setUniform("u_texture", cpuGraphics);
    drawParticles(p, state);
    pixelizeShader.setUniform("u_glowTexture", particleGraphics);
    pixelizeShader.setUniform("u_glowLevel", 0.9);

    mainGraphics.quad(-1, -1, 1, -1, 1, 1, -1, 1);
  }

  const alphaNote = backgroundTrack.track.notes.find(
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

const drawParticles = (p: p5, state: State) => {
  particleGraphics = import.meta.autoGraphics(
    p,
    "particleGraphics",
    p.width / dotUnit,
    p.height / dotUnit,
  );
  using _context = useRendererContext(particleGraphics);
  particleGraphics.noSmooth();
  particleGraphics.translate(p.width / dotUnit / 2, (p.height / dotUnit) * 0.5);

  particleGraphics.clear();

  const particleNote = backgroundTrack.track.notes.find(
    (note) =>
      note.midi === particleMidi &&
      note.ticks <= state.currentTick &&
      state.currentTick < note.ticks + note.durationTicks,
  );
  if (!particleNote) return;

  const rotate = state.currentTick * 0.0001;
  particleGraphics.fill(255, 255, 255, 255);
  particleGraphics.noStroke();
  particleGraphics.noSmooth();
  const actualInterval = Math.round(particleInterval / particleNote.velocity);
  for (
    let f = particleNote.ticks - particleInterval * 256;
    f < state.currentTick;
    f += actualInterval
  ) {
    using _context = useRendererContext(particleGraphics);
    const rand = new Rand(
      `${particleNote.ticks}:${particleNote.velocity}:${f}`,
    );
    const frames = f - particleNote.ticks;
    const elapsed = state.currentTick - f;
    const direction = f * 0.0001 + rotate + rand.next() * Math.PI * 2;
    const x = Math.cos(direction) * elapsed * particleSpeed;
    const y = Math.sin(direction) * elapsed * particleSpeed;

    if ((frames / actualInterval) % 2 === 0) {
      particleGraphics.fill(
        ...saturate(tycColor, elapsed * colorScale * particleNote.velocity),
      );
    } else {
      particleGraphics.fill(
        ...saturate(reiColor, elapsed * colorScale * particleNote.velocity),
      );
    }

    const scaleBase = Math.abs(Math.sin(frames * 0.01 + particleNote.ticks));

    particleGraphics.rotate(Math.PI / 4);
    particleGraphics.rectMode(p.CENTER);
    particleGraphics.rect(x, y, elapsed * particleScale * scaleBase);
  }
};
