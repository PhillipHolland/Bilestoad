# Bilestoad (2025)

A modern browser reimagining of the legendary 1982 Apple II game *The Bilestoad* by Marc Goodman (Mangrove Earthshoe).

## Controls

**Player 1**
- `WASD` — Move and face direction
- `J` / `K` — Left arm (shield) swings
- `L` / `;` — Right arm (axe) swings

**Player 2 (hotseat)**
- Arrow keys — Move and face
- `U` / `I` — Left arm
- `O` / `P` — Right arm

**Other**
- `R` — Restart
- `T` — Toggle AI vs 2P hotseat
- `M` — Toggle sound (Web Audio)
- `ESC` — Pause

## Run locally

```bash
npm install
npm run dev
```

## Deploy

Push to GitHub → connect the repo to a new Vercel project. It will deploy automatically.

## Philosophy

We kept the original's crunchy independent-arm combat and dismemberment focus, but made it smooth, colorful, and actually fun to play on a modern machine with a real keyboard.

Sound is 100% procedural via Web Audio API — no external files.

## Credits

Original game © 1982 Datamost / Marc Goodman  
This is a non-commercial fan tribute.
