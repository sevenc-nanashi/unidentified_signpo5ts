import type { Note } from "@tonejs/midi/dist/Note";
import type p5 from "p5";
import { dotUnit, mainFont, reiColor, tycColor } from "../const";
import type { State } from "../state";
import timelineMid from "../assets/timeline.mid?mid";
import { dim, useRendererContext } from "../utils";
import { atlasMap } from "../atlas";
import { characterLabs } from "../lab";
import { easeInQuint, easeOutQuint, unlerp } from "../easing";
import mainImageUrl from "../assets/illusts/main.png?url";
import Rand from "rand-seed";

const spritesTrack = timelineMid.tracks.find(
  (track) => track.name === "sprites",
)!;
let mainImage: p5.Image;

const reiBaseNote = 60;
const tycBaseNote = 72;

const jumpHeight = 8;

export const draw = import.meta.hmrify((p: p5, state: State) => {
  if (!mainImage) {
    mainImage = p.loadImage(mainImageUrl);
  }
  const characterX = 150;
  const characterMinusY = 20;

  using _context = useRendererContext(p);
  p.noSmooth();
  p.translate(p.width / 2, p.height / 2);
  p.scale(dotUnit);
  p.translate(0, Math.max(atlasMap["rei"].height, atlasMap["tyc"].height) / 2);
  {
    using _context = useRendererContext(p);
    p.translate(characterX, 0);
    drawCharacter(p, p, state, "rei", reiBaseNote);
  }
  {
    using _context = useRendererContext(p);
    p.translate(-characterX, 0);
    drawCharacter(p, p, state, "tyc", tycBaseNote);
  }
});

const drawCharacter = (
  p: p5,
  graphics: p5,
  state: State,
  name: keyof typeof characterLabs,
  baseMidi: number,
) => {
  const note = spritesTrack.notes.find(
    (note) =>
      note.midi >= baseMidi &&
      note.midi < baseMidi + 4 &&
      note.ticks <= state.currentTick &&
      state.currentTick < note.ticks + note.durationTicks,
  );
  if (!note) {
    return;
  }
  const atlas = atlasMap[name];
  const yShift = note.midi === baseMidi ? 1 : 0;
  const footPixel = atlas.yellowPixels[2];
  const footY = footPixel[1] - atlas.start[1];

  const isClosed = spritesTrack.notes.find(
    (note) =>
      note.midi === baseMidi + 4 &&
      note.ticks <= state.currentTick &&
      state.currentTick < note.ticks + note.durationTicks,
  );
  const isOpen2 = spritesTrack.notes.find(
    (note) =>
      note.midi === baseMidi + 5 &&
      note.ticks <= state.currentTick &&
      state.currentTick < note.ticks + note.durationTicks,
  );

  const eyeAtlas =
    atlasMap[
      `${name}_eyes_${isOpen2 ? "open2" : isClosed ? "closed" : "open"}`
    ];
  const eyePixel = atlas.yellowPixels[0];
  const eyePixelDiff = [
    eyePixel[0] - atlas.start[0],
    eyePixel[1] - atlas.start[1],
  ];
  const currentMouth = characterLabs[name].find(
    (lab) => lab.start <= state.currentTime && state.currentTime < lab.end,
  );
  const mouthAtlas =
    atlasMap[`${name}_mouth_${currentMouth?.phoneme}`] ||
    atlasMap[`${name}_mouth_n`];
  const mouthPixel = atlas.yellowPixels[1];
  const mouthPixelDiff = [
    mouthPixel[0] - atlas.start[0],
    mouthPixel[1] - atlas.start[1],
  ];

  let jumpShift = 0;
  const jumpNote = spritesTrack.notes.find(
    (note) =>
      note.midi === baseMidi + 6 &&
      note.ticks <= state.currentTick &&
      state.currentTick < note.ticks + note.durationTicks,
  );
  let jumpShiftProgress = 0;
  let jumpSeed = "";
  if (jumpNote) {
    jumpShiftProgress =
      (1 -
        (state.currentTick - (jumpNote.ticks + jumpNote.durationTicks / 2)) **
          2 /
          (jumpNote.durationTicks / 2) ** 2) *
      jumpNote.velocity;
    const jumpProgress = unlerp(
      jumpNote.ticks,
      jumpNote.ticks + jumpNote.durationTicks,
      state.currentTick,
    );
    jumpSeed = jumpNote.ticks.toString();

    jumpShift = Math.ceil(jumpShiftProgress * jumpHeight);

    if (jumpShift > 0) {
      graphics.fill(
        255,
        255,
        255,
        255 * (1 - jumpProgress) ** 3 * easeOutQuint(jumpNote.velocity),
      );
      graphics.noStroke();
      const footWidth = atlas.yellowPixels[1][0] - atlas.yellowPixels[0][0];
      const baseX = Math.round(atlas.yellowPixels[1][0] - atlas.start[0] - atlas.width / 2);
      const rand = new Rand(`${jumpSeed}:${name}:${jumpShift}`);
      graphics.rect(
        baseX - footWidth - 2,
        -atlas.height + footY + 2 - jumpShift + Math.round(rand.next()),
        1,
        Math.ceil(6 * jumpShiftProgress * (rand.next() / 2 + 0.5)),
      );
      graphics.rect(
        baseX + footWidth + 2,
        -atlas.height + footY + 2 - jumpShift + Math.round(rand.next()),
        1,
        Math.ceil(6 * jumpShiftProgress * (rand.next() / 2 + 0.5)),
      );
      for (let x = baseX - footWidth + 1; x <= baseX + footWidth - 1; x += 2) {
        graphics.rect(
          x,
          -jumpShift + 2 + Math.round(rand.next()),
          1,
          Math.ceil(2 * jumpShiftProgress),
        );
      }
    }
  }

  graphics.translate(0, -jumpShift);

  graphics.image(
    mainImage,
    -atlas.width / 2,
    -atlas.height + footY,
    atlas.width,
    atlas.height - footY,
    atlas.start[0],
    atlas.start[1] + footY,
    atlas.width,
    atlas.height - footY,
  );
  graphics.image(
    mainImage,
    -atlas.width / 2,
    -atlas.height + yShift,
    atlas.width,
    footY,
    ...atlas.start,
    atlas.width,
    footY,
  );
  graphics.image(
    mainImage,
    -atlas.width / 2 + eyePixelDiff[0],
    -atlas.height + eyePixelDiff[1] + yShift,
    eyeAtlas.width,
    eyeAtlas.height,
    ...eyeAtlas.start,
    eyeAtlas.width,
    eyeAtlas.height,
  );
  graphics.image(
    mainImage,
    -atlas.width / 2 + mouthPixelDiff[0],
    -atlas.height + mouthPixelDiff[1] + yShift,
    mouthAtlas.width,
    mouthAtlas.height,
    ...mouthAtlas.start,
    mouthAtlas.width,
    mouthAtlas.height,
  );
};

const getAlpha = (state: State, spawnMidi: number, persistMidi: number) => {
  let alpha = 0;
  const spawnNote = spritesTrack.notes.find(
    (note) =>
      note.midi === spawnMidi &&
      note.ticks <= state.currentTick &&
      state.currentTick < note.ticks + note.durationTicks,
  );
  if (spawnNote) {
    alpha = easeOutQuint(
      unlerp(
        spawnNote.ticks,
        spawnNote.ticks + spawnNote.durationTicks,
        state.currentTick,
      ),
    );
  }
  const persistNote = spritesTrack.notes.find(
    (note) =>
      note.midi === persistMidi &&
      note.ticks <= state.currentTick &&
      state.currentTick < note.ticks + note.durationTicks,
  );
  if (persistNote) {
    alpha = 1;
  }
  return alpha;
};
