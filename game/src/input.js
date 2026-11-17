// Dawnwell input: keyboard (arrows / WASD), mouse and touch all feed one
// small state object. The game loop reads axes and edge-triggered actions;
// this module owns the listeners and the pointer-to-field mapping.

export const ACTION_START = 'start';
export const ACTION_DASH = 'dash';
export const ACTION_PAUSE = 'pause';

export function createInput(canvas, field) {
  const held = new Set();
  const pressed = [];
  let pointerX = null;
  let pointerY = null;
  let pointerDown = false;

  function queue(action) {
    pressed.push(action);
  }

  function onKeyDown(event) {
    const code = event.code;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(code)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    held.add(code);
    if (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight') queue(ACTION_DASH);
    if (code === 'Enter' || code === 'Space') queue(ACTION_START);
    if (code === 'KeyP' || code === 'Escape') queue(ACTION_PAUSE);
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  function pointerToField(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = field.width / Math.max(1, rect.width);
    const scaleY = field.height / Math.max(1, rect.height);
    pointerX = (event.clientX - rect.left) * scaleX;
    pointerY = (event.clientY - rect.top) * scaleY;
  }

  function onPointerMove(event) {
    pointerToField(event);
  }

  function onPointerDown(event) {
    pointerToField(event);
    pointerDown = true;
    queue(ACTION_START);
  }

  function onPointerUp() {
    pointerDown = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);

  return {
    axisX() {
      let axis = 0;
      if (held.has('ArrowLeft') || held.has('KeyA')) axis -= 1;
      if (held.has('ArrowRight') || held.has('KeyD')) axis += 1;
      return axis;
    },
    axisY() {
      let axis = 0;
      if (held.has('ArrowUp') || held.has('KeyW')) axis -= 1;
      if (held.has('ArrowDown') || held.has('KeyS')) axis += 1;
      return axis;
    },
    pointer() {
      return pointerX === null ? null : { x: pointerX, y: pointerY, down: pointerDown };
    },
    clearPointer() {
      pointerX = null;
      pointerY = null;
    },
    takePressed() {
      const out = pressed.slice();
      pressed.length = 0;
      return out;
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
    },
  };
}
