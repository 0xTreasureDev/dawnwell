// Screenshot scenes behind ?shot=start|play|end|win. Each scene steps the
// real world forward with a simple keeper pilot — chase the lowest falling
// drop or sun, sidestep shards — so a screenshot is an honest frame of a
// short game, and a fixed seed always stages the same frame.

import { FIELD, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN, KIND_DROP, KIND_SHARD, KIND_SUN } from './entities.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

function pilotMove(state) {
  const keeper = state.keeper;
  const centre = keeper.x + keeper.width / 2;
  // A shard about to land on the keeper outranks any catch.
  for (const item of state.items) {
    if (item.kind !== KIND_SHARD) continue;
    const itemCentre = item.x + item.width / 2;
    if (item.y > FIELD.height * 0.45 && Math.abs(itemCentre - centre) < 58) {
      return { x: itemCentre < centre ? 1 : -1, y: 0 };
    }
  }
  let target = null;
  for (const item of state.items) {
    if (item.kind !== KIND_DROP && item.kind !== KIND_SUN) continue;
    if (target === null || item.y > target.y) target = item;
  }
  if (!target) return { x: 0, y: 0 };
  const targetCentre = target.x + target.width / 2;
  const dx = targetCentre - centre;
  return { x: dx > 10 ? 1 : dx < -10 ? -1 : 0, y: 0 };
}

function pilotMoveCareless(state) {
  // The end scene's pilot barely dodges, so shards end its run like a
  // hurried player's — that is how the game-over frame is earned honestly.
  const keeper = state.keeper;
  const centre = keeper.x + keeper.width / 2;
  let target = null;
  for (const item of state.items) {
    if (item.kind === KIND_DROP && (target === null || item.y > target.y)) target = item;
  }
  if (!target) return { x: 0, y: 0 };
  const dx = target.x + target.width / 2 - centre;
  return { x: dx > 14 ? 1 : dx < -14 ? -1 : 0, y: 0 };
}

export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    for (let i = 0; i < 13 / STEP; i += 1) {
      if (world.step(STEP, pilotMove(world.state), false) & (EVENT_OVER | EVENT_WIN)) break;
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'end') {
    for (let i = 0; i < 900 / STEP; i += 1) {
      if (world.step(STEP, pilotMoveCareless(world.state), false) & EVENT_OVER) break;
      if (world.state.over) break;
    }
    // If the careless pilot somehow survived, show its honest final frame.
    return { screen: world.state.over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'win') {
    for (let i = 0; i < 400 / STEP; i += 1) {
      if (world.step(STEP, pilotMove(world.state), false) & EVENT_WIN) break;
      if (world.state.won) break;
    }
    return { screen: world.state.won ? SCREEN_WIN : SCREEN_PLAY, best: world.state.score };
  }
  for (let i = 0; i < 4 / STEP; i += 1) world.step(STEP, { x: 0, y: 0 }, false);
  world.reset();
  for (let i = 0; i < 2 / STEP; i += 1) world.step(STEP, { x: 0, y: 0 }, true);
  return { screen: SCREEN_TITLE, best: 0 };
}
