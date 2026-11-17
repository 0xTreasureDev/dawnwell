// Dawnwell world: the keeper, falling drops / suns / shards, waves, combo,
// shield, dash and scoring. Pure simulation with a fixed step — rendering
// and input live elsewhere, so this file can be stepped deterministically
// for the screenshot scenes.

import { FIELD, KEEPER, SCORE, WAVE } from './config.js';

export const KIND_DROP = 'drop';
export const KIND_SUN = 'sun';
export const KIND_SHARD = 'shard';

export const EVENT_CATCH = 1;
export const EVENT_SUN = 2;
export const EVENT_HURT = 4;
export const EVENT_WAVE = 8;
export const EVENT_OVER = 16;
export const EVENT_WIN = 32;
export const EVENT_DASH = 64;

export function createWorld(random) {
  const state = {
    time: 0,
    wave: 1,
    waveTime: 0,
    score: 0,
    lives: KEEPER.startLives,
    combo: 0,
    bestCombo: 0,
    caught: 0,
    shield: false,
    over: false,
    won: false,
    keeper: null,
    items: [],
    sparks: [],
    spawnTimer: 0,
    flash: 0,
    message: '',
    messageTime: 0,
  };

  function freshKeeper() {
    return {
      x: FIELD.width / 2 - KEEPER.width / 2,
      y: FIELD.height - 92,
      width: KEEPER.width,
      height: KEEPER.height,
      dashTime: 0,
      dashCooldown: 0,
      dashDirX: 0,
      dashDirY: 0,
      hurtTime: 0,
    };
  }

  function reset() {
    state.time = 0;
    state.wave = 1;
    state.waveTime = 0;
    state.score = 0;
    state.lives = KEEPER.startLives;
    state.combo = 0;
    state.bestCombo = 0;
    state.caught = 0;
    state.shield = false;
    state.over = false;
    state.won = false;
    state.keeper = freshKeeper();
    state.items = [];
    state.sparks = [];
    state.spawnTimer = 0.3;
    state.flash = 0;
    state.message = '';
    state.messageTime = 0;
  }

  function spawnEvery() {
    return Math.max(0.34, WAVE.firstSpawnEvery - (state.wave - 1) * WAVE.spawnShrinkPerWave);
  }

  function spawnItem() {
    const roll = random();
    let kind = KIND_DROP;
    if (roll > 0.93) kind = KIND_SUN;
    else if (roll > 0.93 - (0.2 + state.wave * 0.035)) kind = KIND_SHARD;
    const size = kind === KIND_SHARD ? 26 : kind === KIND_SUN ? 30 : 24;
    state.items.push({
      kind,
      x: 24 + random() * (FIELD.width - 48 - size),
      y: -size - 4,
      width: size,
      height: size,
      speed: 150 + random() * 90 + (state.wave - 1) * WAVE.fallBoostPerWave,
      sway: random() * Math.PI * 2,
      swaySpeed: 1 + random() * 1.6,
      spin: random() * Math.PI * 2,
      active: true,
    });
  }

  function burst(x, y, colour, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = random() * Math.PI * 2;
      const speed = 40 + random() * 130;
      state.sparks.push({
        x, y, colour,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 0.45 + random() * 0.3,
        age: 0,
      });
    }
  }

  function overlaps(item, keeper) {
    const pad = 6;
    return (
      item.x + pad < keeper.x + keeper.width &&
      item.x + item.width - pad > keeper.x &&
      item.y + item.height - pad > keeper.y &&
      item.y + pad < keeper.y + keeper.height + 10
    );
  }

  function say(text) {
    state.message = text;
    state.messageTime = 1.6;
  }

  // move: {x, y} axes in -1..1, dash: boolean edge trigger for this step.
  function step(dt, move, dash) {
    if (state.over || state.won) return 0;
    let events = 0;
    const keeper = state.keeper;
    state.time += dt;
    state.waveTime += dt;
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 2.4);
    if (state.messageTime > 0) state.messageTime = Math.max(0, state.messageTime - dt);
    if (keeper.hurtTime > 0) keeper.hurtTime = Math.max(0, keeper.hurtTime - dt);

    // Wave clock: clearing a wave pays a bonus; clearing the last one wins.
    if (state.waveTime >= WAVE.seconds) {
      state.score += SCORE.waveClearBonus;
      burst(FIELD.width / 2, FIELD.height / 2, '#ffd76a', 22);
      if (state.wave >= WAVE.countToWin) {
        state.score += SCORE.dawnTargetBonus;
        state.won = true;
        return events | EVENT_WIN | EVENT_WAVE;
      }
      state.wave += 1;
      state.waveTime = 0;
      say('Wave ' + state.wave + ' — the sky quickens!');
      events |= EVENT_WAVE;
    }

    // Dash: a short burst in the held direction (or last facing if still).
    if (keeper.dashCooldown > 0) keeper.dashCooldown = Math.max(0, keeper.dashCooldown - dt);
    if (dash && keeper.dashCooldown <= 0 && (move.x !== 0 || move.y !== 0)) {
      keeper.dashTime = KEEPER.dashSeconds;
      keeper.dashCooldown = KEEPER.dashCooldown;
      keeper.dashDirX = move.x;
      keeper.dashDirY = move.y;
      events |= EVENT_DASH;
    }
    const speed = keeper.dashTime > 0 ? KEEPER.dashSpeed : KEEPER.speed;
    const dirX = keeper.dashTime > 0 ? keeper.dashDirX : move.x;
    const dirY = keeper.dashTime > 0 ? keeper.dashDirY : move.y;
    if (keeper.dashTime > 0) keeper.dashTime = Math.max(0, keeper.dashTime - dt);
    keeper.x += dirX * speed * dt;
    keeper.y += dirY * speed * dt;
    keeper.x = Math.max(8, Math.min(FIELD.width - keeper.width - 8, keeper.x));
    keeper.y = Math.max(FIELD.height * 0.45, Math.min(FIELD.height - 56, keeper.y));

    // Spawning.
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnItem();
      state.spawnTimer = spawnEvery() * (0.7 + random() * 0.6);
    }

    // Falling items, sway, catches and misses.
    for (const item of state.items) {
      if (!item.active) continue;
      item.y += item.speed * dt;
      item.sway += item.swaySpeed * dt;
      item.spin += dt * 2;
      item.x += Math.sin(item.sway) * 18 * dt;
      if (overlaps(item, keeper)) {
        item.active = false;
        const cx = keeper.x + keeper.width / 2;
        if (item.kind === KIND_DROP) {
          state.combo += 1;
          state.bestCombo = Math.max(state.bestCombo, state.combo);
          const gain = SCORE.drop + Math.min(state.combo - 1, 8) * 5;
          state.score += gain;
          state.caught += 1;
          burst(cx, keeper.y, '#8fe3ff', 8);
          events |= EVENT_CATCH;
        } else if (item.kind === KIND_SUN) {
          state.score += SCORE.sun;
          state.caught += 1;
          if (!state.shield) {
            state.shield = true;
            say('Sun caught — shield lit!');
          } else {
            state.lives = Math.min(5, state.lives + 1);
            say('Sun caught — +1 heart!');
          }
          burst(cx, keeper.y, '#ffc94d', 14);
          events |= EVENT_SUN;
        } else {
          if (state.shield) {
            state.shield = false;
            state.combo = 0;
            say('Shield shattered!');
            burst(cx, keeper.y, '#7dffce', 12);
          } else {
            state.lives -= 1;
            state.combo = 0;
            keeper.hurtTime = 0.5;
            state.flash = 1;
            say('Thorn shard! Hearts left: ' + state.lives);
            burst(cx, keeper.y, '#ff5d73', 12);
          }
          events |= EVENT_HURT;
          if (state.lives <= 0) {
            state.over = true;
            events |= EVENT_OVER;
          }
        }
      } else if (item.y > FIELD.height + 10) {
        item.active = false;
        if (item.kind === KIND_DROP) state.combo = 0;
      }
    }
    state.items = state.items.filter((item) => item.active);

    // Sparks.
    for (const spark of state.sparks) {
      spark.age += dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vy += 160 * dt;
    }
    state.sparks = state.sparks.filter((spark) => spark.age < spark.life);
    return events;
  }

  reset();
  return { state, step, reset };
}
