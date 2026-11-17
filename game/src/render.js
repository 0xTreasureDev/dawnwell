// Dawnwell rendering: night garden, the moonwell, the keeper's lantern
// basket, falling drops / suns / shards, HUD and every screen (title, play,
// paused, dawn victory, game over). All art is drawn with canvas shapes —
// no image files.

import { FIELD, KEEPER, PALETTE, WAVE } from './config.js';
import { KIND_DROP, KIND_SHARD, KIND_SUN } from './entities.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;

  // Fixed starfield, generated once from a tiny local LCG so it never flickers.
  const stars = [];
  let starSeed = 1234567;
  function starRand() {
    starSeed = (starSeed * 1103515245 + 12345) % 2147483648;
    return starSeed / 2147483648;
  }
  for (let i = 0; i < 90; i += 1) {
    stars.push({ x: starRand() * FIELD.width, y: starRand() * 330, r: 0.8 + starRand() * 1.6, tw: starRand() * 6 });
  }

  function drawBackground(state, dawn) {
    const grad = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    if (dawn) {
      grad.addColorStop(0, '#3a2a63');
      grad.addColorStop(0.55, '#8a4a6d');
      grad.addColorStop(1, '#d98a4b');
    } else {
      grad.addColorStop(0, PALETTE.skyTop);
      grad.addColorStop(1, PALETTE.skyBottom);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    for (const star of stars) {
      const alpha = dawn ? 0.25 : 0.45 + 0.4 * Math.sin(state.time * 1.4 + star.tw);
      ctx.globalAlpha = Math.max(0.08, alpha);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Moon (or rising sun at dawn).
    const moonX = FIELD.width - 130;
    const moonY = dawn ? 150 : 86;
    const glow = ctx.createRadialGradient(moonX, moonY, 8, moonX, moonY, 90);
    glow.addColorStop(0, dawn ? 'rgba(255,190,90,0.9)' : 'rgba(255,240,190,0.75)');
    glow.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(moonX - 90, moonY - 90, 180, 180);
    ctx.fillStyle = dawn ? '#ffb84d' : '#fdf3c4';
    ctx.beginPath();
    ctx.arc(moonX, moonY, dawn ? 40 : 30, 0, Math.PI * 2);
    ctx.fill();

    // Hills and ground.
    ctx.fillStyle = PALETTE.hillFar;
    ctx.beginPath();
    ctx.moveTo(0, 470);
    ctx.quadraticCurveTo(220, 410, 470, 462);
    ctx.quadraticCurveTo(720, 505, FIELD.width, 448);
    ctx.lineTo(FIELD.width, FIELD.height);
    ctx.lineTo(0, FIELD.height);
    ctx.fill();
    ctx.fillStyle = PALETTE.hillNear;
    ctx.beginPath();
    ctx.moveTo(0, 520);
    ctx.quadraticCurveTo(300, 478, 620, 516);
    ctx.quadraticCurveTo(820, 540, FIELD.width, 508);
    ctx.lineTo(FIELD.width, FIELD.height);
    ctx.lineTo(0, FIELD.height);
    ctx.fill();
    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(0, FIELD.height - 34, FIELD.width, 34);

    // The moonwell at the centre of the ground: it brightens with the score.
    const wellX = FIELD.width / 2;
    const wellY = FIELD.height - 30;
    const lit = 0.35 + Math.min(0.6, state.score / 2600);
    const wellGlow = ctx.createRadialGradient(wellX, wellY, 4, wellX, wellY, 120);
    wellGlow.addColorStop(0, 'rgba(255,215,106,' + lit + ')');
    wellGlow.addColorStop(1, 'rgba(255,215,106,0)');
    ctx.fillStyle = wellGlow;
    ctx.fillRect(wellX - 120, wellY - 120, 240, 130);
    ctx.fillStyle = '#3a2c14';
    ctx.beginPath();
    ctx.ellipse(wellX, wellY, 74, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.wellGlow;
    ctx.beginPath();
    ctx.ellipse(wellX, wellY - 2, 62, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawItem(item) {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    if (item.kind === KIND_DROP) {
      ctx.fillStyle = PALETTE.drop;
      ctx.beginPath();
      ctx.moveTo(cx, item.y);
      ctx.quadraticCurveTo(item.x + item.width, cy + 4, cx, item.y + item.height);
      ctx.quadraticCurveTo(item.x, cy + 4, cx, item.y);
      ctx.fill();
      ctx.fillStyle = PALETTE.dropCore;
      ctx.beginPath();
      ctx.arc(cx - 3, cy + 5, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.kind === KIND_SUN) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(item.spin * 0.7);
      ctx.strokeStyle = PALETTE.sun;
      ctx.lineWidth = 3;
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 11, Math.sin(a) * 11);
        ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = PALETTE.sun;
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(cx - 3, cy - 3, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.sin(item.spin) * 0.5);
      ctx.fillStyle = PALETTE.shard;
      ctx.beginPath();
      ctx.moveTo(0, -item.height / 2);
      ctx.lineTo(item.width / 2, item.height / 4);
      ctx.lineTo(item.width / 5, item.height / 2);
      ctx.lineTo(-item.width / 5, item.height / 2);
      ctx.lineTo(-item.width / 2, item.height / 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETTE.shardDark;
      ctx.beginPath();
      ctx.moveTo(0, -item.height / 2);
      ctx.lineTo(item.width / 5, item.height / 2);
      ctx.lineTo(-item.width / 5, item.height / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawKeeper(state) {
    const k = state.keeper;
    const cx = k.x + k.width / 2;
    if (state.shield) {
      ctx.strokeStyle = PALETTE.shield;
      ctx.globalAlpha = 0.75 + 0.2 * Math.sin(state.time * 5);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, k.y + 4, k.width / 2 + 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (k.hurtTime > 0 && Math.floor(state.time * 14) % 2 === 0) ctx.globalAlpha = 0.35;
    // Lantern glow above the basket.
    const lanternY = k.y - 20;
    const glow = ctx.createRadialGradient(cx, lanternY, 2, cx, lanternY, 34);
    glow.addColorStop(0, 'rgba(255,190,80,0.85)');
    glow.addColorStop(1, 'rgba(255,190,80,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 34, lanternY - 34, 68, 68);
    ctx.fillStyle = '#2c1c08';
    ctx.fillRect(cx - 2, lanternY + 8, 4, 12);
    ctx.fillStyle = PALETTE.keeper;
    ctx.beginPath();
    ctx.arc(cx, lanternY, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(cx - 2, lanternY - 2, 4, 0, Math.PI * 2);
    ctx.fill();
    // Woven basket the drops land in.
    ctx.fillStyle = PALETTE.keeper;
    roundRect(ctx, k.x, k.y, k.width, k.height, 9);
    ctx.fill();
    ctx.fillStyle = PALETTE.keeperDark;
    roundRect(ctx, k.x, k.y, k.width, 7, 4);
    ctx.fill();
    ctx.fillRect(k.x + 14, k.y + 10, 4, k.height - 12);
    ctx.fillRect(k.x + k.width / 2 - 2, k.y + 10, 4, k.height - 12);
    ctx.fillRect(k.x + k.width - 18, k.y + 10, 4, k.height - 12);
    ctx.globalAlpha = 1;
  }

  function drawSparks(state) {
    for (const spark of state.sparks) {
      ctx.globalAlpha = Math.max(0, 1 - spark.age / spark.life);
      ctx.fillStyle = spark.colour;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state, best) {
    ctx.fillStyle = 'rgba(10,8,28,0.55)';
    roundRect(ctx, 12, 10, FIELD.width - 24, 46, 10);
    ctx.fill();
    ctx.fillStyle = PALETTE.ink;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Score ' + state.score, 26, 40);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('Best ' + Math.max(best, state.score), 170, 40);
    ctx.fillStyle = PALETTE.accent;
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Wave ' + state.wave + ' / ' + WAVE.countToWin, FIELD.width / 2 - 30, 40);
    const waveLeft = Math.max(0, WAVE.seconds - state.waveTime);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(waveLeft.toFixed(0) + 's to ' + (state.wave >= WAVE.countToWin ? 'dawn' : 'next wave'), FIELD.width / 2 + 92, 40);
    // Hearts.
    ctx.textAlign = 'right';
    for (let i = 0; i < Math.max(state.lives, 0); i += 1) {
      ctx.fillStyle = '#ff6b81';
      const hx = FIELD.width - 34 - i * 26;
      ctx.beginPath();
      ctx.moveTo(hx, 38);
      ctx.bezierCurveTo(hx - 12, 24, hx - 4, 16, hx, 24);
      ctx.bezierCurveTo(hx + 4, 16, hx + 12, 24, hx, 38);
      ctx.fill();
    }
    if (state.combo >= 2) {
      ctx.fillStyle = PALETTE.drop;
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Combo x' + state.combo, 26, 78);
    }
    if (state.shield) {
      ctx.fillStyle = PALETTE.shield;
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('SHIELD ON', FIELD.width - 26, 78);
    }
    if (state.messageTime > 0 && state.message) {
      ctx.globalAlpha = Math.min(1, state.messageTime);
      ctx.fillStyle = PALETTE.accent;
      ctx.font = 'bold 19px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(state.message, FIELD.width / 2, 92);
      ctx.globalAlpha = 1;
    }
    // Dash cooldown pip.
    const k = state.keeper;
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    roundRect(ctx, 26, FIELD.height - 22, 90, 7, 3);
    ctx.fill();
    ctx.fillStyle = k.dashCooldown <= 0 ? PALETTE.shield : PALETTE.dim;
    const ready = 1 - Math.max(0, k.dashCooldown) / KEEPER.dashCooldown;
    roundRect(ctx, 26, FIELD.height - 22, 90 * ready, 7, 3);
    ctx.fill();
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('DASH', 26, FIELD.height - 26 + 0);
  }

  function panel(title, lines, accent) {
    ctx.fillStyle = 'rgba(8,6,24,0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = 'rgba(20,16,48,0.96)';
    roundRect(ctx, FIELD.width / 2 - 330, 100, 660, 396, 18);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    roundRect(ctx, FIELD.width / 2 - 330, 100, 660, 396, 18);
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, FIELD.width / 2, 176);
    ctx.fillStyle = PALETTE.ink;
    ctx.font = '19px system-ui, sans-serif';
    lines.forEach((line, i) => {
      ctx.fillText(line, FIELD.width / 2, 228 + i * 31);
    });
  }

  function draw(state, screen, best) {
    const dawn = screen === SCREEN_WIN;
    drawBackground(state, dawn);
    for (const item of state.items) drawItem(item);
    drawKeeper(state);
    drawSparks(state);
    if (state.flash > 0) {
      ctx.fillStyle = 'rgba(255,60,90,' + state.flash * 0.22 + ')';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    drawHud(state, best);
    if (screen === SCREEN_TITLE) {
      panel('DAWNWELL', [
        'Keep the moonwell lit until dawn.',
        'Catch moon drops, grab suns for a shield,',
        'and dodge the thorn shards.',
        '',
        'Move: arrows / WASD / mouse — Dash: Space / Shift',
        'Survive ' + WAVE.countToWin + ' waves to greet the dawn.',
        '',
        'Press Enter, click, or tap to begin',
      ], PALETTE.accent);
    } else if (screen === SCREEN_PAUSED) {
      panel('PAUSED', ['The garden holds its breath.', '', 'Press P or Esc to continue'], PALETTE.dim);
    } else if (screen === SCREEN_OVER) {
      panel('THE WELL WENT DARK', [
        'Score: ' + state.score + '   Best: ' + Math.max(best, state.score),
        'Drops caught: ' + state.caught + '   Best combo: x' + state.bestCombo,
        'You reached wave ' + state.wave + ' of ' + WAVE.countToWin + '.',
        '',
        'Press Enter or click to try again',
      ], PALETTE.danger);
    } else if (screen === SCREEN_WIN) {
      panel('DAWN BREAKS — YOU WIN!', [
        'The moonwell blazes with first light.',
        'Score: ' + state.score + '   Best: ' + Math.max(best, state.score),
        'Drops caught: ' + state.caught + '   Best combo: x' + state.bestCombo,
        '',
        'Press Enter or click to play again',
      ], PALETTE.sun);
    }
  }

  return { draw };
}
