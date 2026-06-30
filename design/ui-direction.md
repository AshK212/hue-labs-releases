# UI Direction

## Product positioning

We are **not** replacing Ollama. We are a **friendly control layer on top of it** —
the calm front door that makes local AI approachable for people who would never open
a terminal. Every screen should reduce anxiety, not add it.

## Who we design for

A capable but **non-technical** person. They understand "faster" and "your computer";
they do not want to see flags, config files, or stack traces. Jargon is translated
into plain language at every step.

## Feeling / mood

**Calm, minimal, modern — a soft sky / cloud aesthetic.** Light, airy, and reassuring.
Think "a clear morning sky", not "a server dashboard".

## Visual language

- **Palette**
  - Backgrounds: soft cloud whites and very light blue-greys (`cloud-50/100/200`).
  - Accent: a friendly sky blue (`sky-400/500/600`) for primary actions and progress.
  - Text: soft ink tones (`ink-500/700/900`) instead of harsh black.
  - Success: a gentle emerald, used sparingly for "it worked" and positive gains.
- **Backdrop:** a subtle radial sky-glow at the top fading into a soft vertical
  gradient — the "cloud" feel, never busy.
- **Surfaces:** white cards with generous rounding (`rounded-xl2`), soft shadows,
  and a faint border. Plenty of whitespace.
- **Typography:** Inter. Clear hierarchy, comfortable line-height, no dense tables.
- **Motion:** small, soft transitions (gentle hover, button press scale, calm
  spinners). Nothing flashy.

## Layout

- A single, centered column the user reads **top to bottom** — the workflow *is* the
  page. No multi-pane "dashboard".
- A slim **stepper** at the top shows the six steps and where the user is.
- Each step is a **card** with a numbered badge that turns into a check when done.
- One clear primary action per card. Secondary actions are quiet (ghost buttons).

## Tone of voice

- Warm, plain, and honest. "Your computer", "Run baseline", "faster after tuning".
- Never over-promise. The recurring honest line:
  **"Measured improvement on this machine."**
- When something is missing (e.g. Ollama not installed), we **guide**, never scold:
  short numbered steps with a friendly link.

## Principles

1. **Calm over clever.** If a screen feels technical, simplify it.
2. **One thing at a time.** Each step has a single obvious next action.
3. **Honesty is the brand.** Real, measured numbers — clearly labelled as such.
4. **No terminal, ever.** Anything a terminal could do, a button does here.
5. **Approachable polish.** It should look finished from the very first screen.
