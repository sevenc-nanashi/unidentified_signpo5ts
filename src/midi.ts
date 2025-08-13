import { Midi, Track } from "@tonejs/midi";
import data from "./assets/main.mid?uint8array";
import { MidiData } from "midi-file";
import { Note } from "@tonejs/midi/dist/Note";

export const midi = new Midi(data);
midi.tracks = midi.tracks.filter((track) => !track.name.startsWith("#"));

export const loadTimelineWithText = (
  trackName: string,
  timelineMid: Midi,
  timelineRawMid: MidiData,
  options?: Partial<{
    midis: number[];
  }>,
): {
  texts: { text: string; time: number; note: Note }[];
  track: Track;
} => {
  const timeline = loadTimelineWithOptionalText(
    trackName,
    timelineMid,
    timelineRawMid,
    options,
  );
  for (const note of timeline.texts) {
    if (!note.note) {
      throw new Error(
        `No note found for text "${note.text}" at time ${note.time}`,
      );
    }
  }
  return {
    texts: timeline.texts as { text: string; time: number; note: Note }[],
    track: timeline.track,
  };
};
export const loadTimelineWithOptionalText = (
  trackName: string,
  timelineMid: Midi,
  timelineRawMid: MidiData,
  options?: Partial<{
    midis: number[];
  }>,
): {
  texts: { text: string; time: number; note: Note | undefined }[];
  track: Track;
} => {
  const midis = options?.midis;
  const tonejsMidiTrack = timelineMid.tracks.find(
    (track) => track.name === trackName,
  )!;
  const rawTrack = timelineRawMid.tracks.find((track) =>
    track.some((note) => note.type === "trackName" && note.text === trackName),
  )!;

  const textEvents = rawTrack.reduce(
    (acc, note) => {
      acc.time += note.deltaTime;
      if (note.type !== "text") {
        return acc;
      }
      const textBytes = note.text.split("").map((char) => char.charCodeAt(0));
      const text = new TextDecoder()
        .decode(new Uint8Array(textBytes))
        .replaceAll("/", "\n");
      const midiNote = tonejsMidiTrack.notes.find(
        (note) =>
          note.ticks + 1 >= acc.time && (!midis || midis.includes(note.midi)),
      );
      acc.texts.push({ text, time: acc.time, note: midiNote });
      return acc;
    },
    {
      texts: [] as { text: string; time: number; note: Note | undefined }[],
      time: 0,
    },
  );

  return { texts: textEvents.texts, track: tonejsMidiTrack };
};
