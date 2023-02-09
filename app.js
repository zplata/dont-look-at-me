import RiveCanvas from "@rive-app/canvas-advanced";
import gaze from "gaze-detection";

import LookRive from "data-url:./look2.riv";

import "./styles.css";

const outwardGazes = ["RIGHT", "LEFT"];

async function main() {
  // 1. Getting access to low-level Rive APIs through WASM
  const rive = await RiveCanvas({
    // Loads Wasm bundle
    locateFile: (_) =>
      `https://unpkg.com/@rive-app/canvas-advanced@1.0.94/rive.wasm`,
  });

  // 2. Setting canvas area
  const canvas = document.getElementById("rive-canvas");
  const { width, height } = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = dpr * width;
  canvas.height = dpr * height;

  // 3. Construct the renderer for our Canvas to draw on
  const renderer = rive.makeRenderer(canvas);

  // 4. Load in our Rive files
  const lookBytes = await (await fetch(new Request(LookRive))).arrayBuffer();
  const lookFile = await rive.load(new Uint8Array(lookBytes));

  // 5. Create instances for the relevant Artboards and State Machines we'll use in our Rive scene
  const lookArtboard = lookFile.artboardByName("AwkwardLook");
  let lookSm = new rive.StateMachineInstance(
    lookArtboard.stateMachineByIndex(0),
    lookArtboard
  );

  // Game SM Inputs
  let staringInput;
  for (let i = 0; i < lookSm.inputCount(); i++) {
    if (lookSm.input(i).name === "isStaring") {
      staringInput = lookSm.input(i).asBool();
    }
  }

  const videoElement = document.querySelector("video");

  const init = async () => {
    await gaze.loadModel();
    // Using the default webcam
    await gaze.setUpCamera(videoElement);

    const predict = async () => {
      const gazePrediction = await gaze.getGazePrediction();
      // If looking left or right, make monkey stare at you, otherwise look away
      if (outwardGazes.indexOf(gazePrediction) > -1) {
        console.log(staringInput.value);
        if (staringInput?.value === false) {
          staringInput.value = true;
        }
      } else {
        staringInput.value = false;
      }
      let raf = requestAnimationFrame(predict);
    };
    await predict();
  };
  await init();

  // Track the timestamp of the last rAF loop
  let lastTime = 0;

  function renderLoop(time) {
    if (!lastTime) {
      lastTime = time;
    }
    const elapsedTimeMs = time - lastTime;
    const elapsedTimeSec = elapsedTimeMs / 1000;
    lastTime = time;

    // 7. Advance relevant state machines and artboards by elapsed time since last draw
    renderer.clear();
    lookSm.advance(elapsedTimeSec);
    lookArtboard.advance(elapsedTimeSec);

    renderer.save();
    renderer.align(
      rive.Fit.contain,
      rive.Alignment.center,
      {
        minX: 0,
        minY: 0,
        maxX: canvas.width,
        maxY: canvas.height,
      },
      lookArtboard.bounds
    );
    lookArtboard.draw(renderer);
    renderer.restore();
    rive.requestAnimationFrame(renderLoop);
  }
  rive.requestAnimationFrame(renderLoop);
}

main();
