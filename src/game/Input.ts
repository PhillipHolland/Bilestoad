// Keyboard input — maps to the original's 6-bit action style + modern niceties

export type ActionMask = number;

export const ACTIONS = {
  LEFT_IN:   1 << 0,
  LEFT_OUT:  1 << 1,
  RIGHT_IN:  1 << 2,
  RIGHT_OUT: 1 << 3,
  TURN_LEFT: 1 << 4,
  TURN_RIGHT:1 << 5,
  THRUST:    1 << 6,
} as const;

export class Input {
  private keys = new Set<string>();
  private prevKeys = new Set<string>();

  private p1Mask: ActionMask = 0;
  private p2Mask: ActionMask = 0;

  constructor() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
  }

  update() {
    // Player 1 — WASD + JKL;
    this.p1Mask = 0;
    if (this.keys.has('w')) this.p1Mask |= ACTIONS.THRUST;
    if (this.keys.has('a')) this.p1Mask |= ACTIONS.TURN_LEFT;
    if (this.keys.has('d')) this.p1Mask |= ACTIONS.TURN_RIGHT;

    if (this.keys.has('j')) this.p1Mask |= ACTIONS.LEFT_IN;
    if (this.keys.has('k')) this.p1Mask |= ACTIONS.LEFT_OUT;
    if (this.keys.has('l')) this.p1Mask |= ACTIONS.RIGHT_IN;
    if (this.keys.has(';')) this.p1Mask |= ACTIONS.RIGHT_OUT;

    // Player 2 — Arrow keys + UIOP
    this.p2Mask = 0;
    if (this.keys.has('arrowup')) this.p2Mask |= ACTIONS.THRUST;
    if (this.keys.has('arrowleft')) this.p2Mask |= ACTIONS.TURN_LEFT;
    if (this.keys.has('arrowright')) this.p2Mask |= ACTIONS.TURN_RIGHT;

    if (this.keys.has('u')) this.p2Mask |= ACTIONS.LEFT_IN;
    if (this.keys.has('i')) this.p2Mask |= ACTIONS.LEFT_OUT;
    if (this.keys.has('o')) this.p2Mask |= ACTIONS.RIGHT_IN;
    if (this.keys.has('p')) this.p2Mask |= ACTIONS.RIGHT_OUT;
  }

  getP1(): ActionMask { return this.p1Mask; }
  getP2(): ActionMask { return this.p2Mask; }

  // One-shot helpers (for menus, restart, etc.)
  justPressed(key: string): boolean {
    const k = key.toLowerCase();
    return this.keys.has(k) && !this.prevKeys.has(k);
  }

  postUpdate() {
    this.prevKeys = new Set(this.keys);
  }

  isPressed(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }
}

export const input = new Input();
