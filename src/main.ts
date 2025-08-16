import p5 from "p5";
import "./style.css";
import { draw, preload } from "./draw.ts";
import { width, height, frameRate } from "./const.ts";
import { State } from "./state.ts";
import audio from "./assets/main.mp3?url";
// import { attachCapturerUi } from "p5-frame-capturer";
import {
  attachCapturerUi,
  state as capturerState,
  startCapturer,
} from "p5-frame-capturer";

const audioElement = new Audio(audio);
audioElement.autoplay = false;
audioElement.volume = 0.5;

new p5((p: p5) => {
  const state = new State(0, false);
  p.disableFriendlyErrors = true;
  p.preload = () => {
    audioElement.load();
    preload(p);
  };
  p.setup = async () => {
    p.frameRate(frameRate);
    p.createCanvas(width, height);
  };

  p.draw = () => {
    if (!audioElement.paused && !state.playing) {
      audioElement.pause();
    }
    if (audioElement.paused && state.playing && !capturerState.isCapturing) {
      audioElement.play();
      audioElement.currentTime = state.currentFrame / frameRate;
    }
    if (capturerState.isCapturing) {
      state.currentFrame = capturerState.frameCount;
    } else if (state.playing) {
      state.currentFrame = audioElement.currentTime * frameRate;
    }
    draw(p, state);
  };

  p.keyPressed = keydown(p, state);

  attachCapturerUi(p);
});

function keydown(p: p5, state: State) {
  return (e: KeyboardEvent) => {
    if (e.key === " ") {
      state.playing = !state.playing;
    }
    if (e.key === "l") {
      forward(1 / frameRate);
    }
    if (e.key === "ArrowRight") {
      forward(5);
    }
    if (e.key === "h") {
      rewind(1 / frameRate);
    }
    if (e.key === "ArrowLeft") {
      rewind(5);
    }
    if (e.key === "ArrowUp") {
      audioElement.volume += 0.1;
    }
    if (e.key === "ArrowDown") {
      audioElement.volume -= 0.1;
    }
    if (e.key === "0") {
      audioElement.currentTime = 0;
      state.currentFrame = 0;
    }

    if (e.key === "r") {
      startCapturer(p, {
        format: "webpLossless",
        frames: (audioElement.duration + 5) * frameRate,
        parallelWriteLimit: 0,
        onFinished: () => {
          fetch(`https://ntfy.sh/${import.meta.env.VITE_NTFY_TOPIC}`, {
            method: "POST",
            body: "All frames are captured!",
            mode: "no-cors",
          });
        },
      });
    }
  };

  function forward(duration: number) {
    if (audioElement.currentTime + duration < audioElement.duration) {
      audioElement.currentTime += duration;
    } else {
      audioElement.currentTime = audioElement.duration;
    }
    state.currentFrame = audioElement.currentTime * frameRate;
  }
  function rewind(duration: number) {
    if (audioElement.currentTime - duration > 0) {
      audioElement.currentTime -= duration;
    } else {
      audioElement.currentTime = 0;
    }
    state.currentFrame = audioElement.currentTime * frameRate;
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    audioElement.pause();
  });
}
