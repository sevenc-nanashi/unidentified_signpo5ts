import p5 from "p5";
import "./style.css";
import { draw, preload } from "./draw.ts";
import { width, height, frameRate } from "./const.ts";
import { State } from "./state.ts";
import audio from "./assets/main.mp3?url";
// import { attachCapturerUi } from "p5-frame-capturer";
import { state as capturerState, startCapturer } from "p5-frame-capturer";

const audioElement = new Audio(audio);
audioElement.autoplay = false;
audioElement.volume = 0.5;

new p5((p: p5) => {
  const state = new State(0, false);
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

  // attachCapturerUi(p);
});

function keydown(p: p5, state: State) {
  return (e: KeyboardEvent) => {
    if (e.key === " ") {
      state.playing = !state.playing;
    }
    if (e.key === "ArrowRight") {
      console.log("current time", audioElement.currentTime);
      audioElement.currentTime += 5;
      console.log("forward to", audioElement.currentTime);
      state.currentFrame = audioElement.currentTime * frameRate;
    }
    if (e.key === "ArrowLeft") {
      // state.currentFrame -= frameRate * 5;
      // if (state.currentFrame < 0) {
      //   state.currentFrame = 0;
      // }
      // audioElement.currentTime = state.currentFrame / frameRate;
      console.log(audioElement.currentTime);
      if (audioElement.currentTime > 5) {
        audioElement.currentTime -= 5;
      } else {
        audioElement.currentTime = 0;
      }
      console.log("rewind to", audioElement.currentTime);
      state.currentFrame = audioElement.currentTime * frameRate;
    }
    if (e.key === "ArrowUp") {
      audioElement.volume += 0.1;
    }
    if (e.key === "ArrowDown") {
      audioElement.volume -= 0.1;
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
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    audioElement.pause();
  });
}
