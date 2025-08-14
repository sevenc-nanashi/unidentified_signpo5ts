import { Track } from "@tonejs/midi";
import { midi } from "./midi.ts";

export const mainDrum = midi.tracks.find((track) => track.name === "Sitala")!;
export const subDrum = midi.tracks.find((track) => track.name === "RVK-808")!;
export const cymbal = midi.tracks.find(
  (track) => track.name === "SI-Drum Kit",
)!;
export const percDrum =
  midi.tracks[midi.tracks.findIndex((track) => track.name === "RVK-808") + 1]!;
export const star =
  midi.tracks[midi.tracks.findIndex((track) => track.name === "fx") + 1];
export const revStar =
  midi.tracks[midi.tracks.findIndex((track) => track.name === "fx") + 2];

export type DrumDefinition = {
  kick: number;
  snare: number;
  hihat: number;
  openHihat: number;
  clap: number;
  star: number;
  revStar: number;
  dial: number;
  lowTom: number;
  highTom: number;
  miniCymbal: number;
  cymbal: number;
};
export const drumDefinition = [
  [
    mainDrum,
    {
      kick: 36,
      snare: 37,
      hihat: 38,
      openHihat: 39,
      clap: 40,
    },
  ],
  [
    subDrum,
    {
      clap: 39,
      miniCymbal: 50,
    },
  ],
  [
    percDrum,
    {
      lowTom: 45,
      highTom: 46,
    },
  ],
  [
    cymbal,
    {
      cymbal: 49,
    },
  ],
  [
    star,
    {
      star: 53,
    },
  ],
  [
    star,
    {
      star: 54,
    },
  ],
  [
    revStar,
    {
      revStar: 65,
    },
  ],
] as [midi: Track, definition: Partial<DrumDefinition>][];
