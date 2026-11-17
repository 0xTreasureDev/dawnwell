// Dawnwell boot and game loop: fixed-step simulation, screen state machine
// (title -> play -> paused -> over / win -> restart), sound on every event,
// and the ?shot= staging used to take the entry's screenshots.
//
// ?seed=N fixes the falling pattern. ?shot=start|play|end|win stages that
// scene, paints it twice and sets window.__shotReady.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld,
  EVENT_CATCH,
  EVENT_DASH,
  EVENT_HURT,
  EVENT_OVER,
  EVENT_SUN,
  EVENT_WAVE,
  EVENT_WIN,
} from './entities.js';
import { ACTION_DASH, ACTION_PAUSE, ACTION_START, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Private windows may refuse storage; the best score then lasts a visit.
  }
}

function announce(text) {
  if (status) status.textContent = text;
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, { width: 960, height: 600 });
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function startRun() {
    world.reset();
    screen = SCREEN_PLAY;
    audio.unlock();
    audio.click();
    announce('Dawnwell started. Catch the moon drops and survive five waves.');
  }

  function handleEvents(events) {
    const state = world.state;
    if (events & EVENT_CATCH) audio.catchDrop(state.combo);
    if (events & EVENT_SUN) audio.catchSun();
    if (events & EVENT_DASH) audio.dash();
    if (events & EVENT_WAVE && !(events & EVENT_WIN)) audio.waveClear();
    if (events & EVENT_HURT) audio.hurt();
    if (events & EVENT_OVER) {
      screen = SCREEN_OVER;
      best = Math.max(best, state.score);
      saveBest(best);
      audio.gameOver();
      announce('Game over. Score ' + state.score + '. Press Enter to try again.');
    }
    if (events & EVENT_WIN) {
      screen = SCREEN_WIN;
      best = Math.max(best, state.score);
      saveBest(best);
      audio.victory();
      announce('Dawn breaks — you win! Score ' + state.score + '.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    let elapsed = (now - last) / 1000;
    last = now;
    if (elapsed > MAX_FRAME) elapsed = MAX_FRAME;

    for (const action of input.takePressed()) {
      if (action === ACTION_START) {
        if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) startRun();
      } else if (action === ACTION_PAUSE) {
        if (screen === SCREEN_PLAY) screen = SCREEN_PAUSED;
        else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
      }
    }

    if (screen === SCREEN_PLAY) {
      accumulator += elapsed;
      const pointer = input.pointer();
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const keys = { x: input.axisX(), y: input.axisY() };
        let move = keys;
        // The pointer steers the keeper toward itself when no key is held.
        if (keys.x === 0 && keys.y === 0 && pointer) {
          const keeper = world.state.keeper;
          const dx = pointer.x - (keeper.x + keeper.width / 2);
          const dy = pointer.y - (keeper.y + keeper.height / 2);
          move = {
            x: Math.abs(dx) < 8 ? 0 : dx > 0 ? 1 : -1,
            y: Math.abs(dy) < 10 ? 0 : dy > 0 ? 1 : -1,
          };
          // Ease off near the pointer so the keeper settles instead of jittering.
          if (Math.abs(dx) < 46 && move.x !== 0) move = { x: 0, y: move.y };
        }
        handleEvents(world.step(STEP, move, dashQueued));
        dashQueued = false;
        if (screen !== SCREEN_PLAY) {
          accumulator = 0;
          break;
        }
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  let dashQueued = false;
  // Dash presses are edge events consumed by the loop above; collect them
  // from the same pressed queue the frame handler drains each frame.
  const originalTake = input.takePressed.bind(input);
  input.takePressed = function takePressed() {
    const actions = originalTake();
    if (actions.includes(ACTION_DASH)) dashQueued = true;
    return actions;
  };

  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
