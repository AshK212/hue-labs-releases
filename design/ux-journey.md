# UX Journey — The Guided Experience

> The experience **is** the product. This document designs the full journey a
> non-technical person takes, screen by screen. The guiding question for every
> screen: *"Would this feel at home in an Apple setup flow?"*

## The core shift

We move from a **scrolling dashboard of cards** (engineer's mental model) to a
**guided, full-screen journey** (a calm onboarding flow). One idea per screen.
One obvious action. Generous space. Soft motion. The user is *led*, never *left
to figure it out*.

Reference feel: Apple device setup · Arc onboarding · Linear's first-run · Raycast.

## Design principles

1. **One screen, one thought.** Never show two decisions at once.
2. **Momentum.** Each screen ends with a single, confident primary action.
3. **Reveal, don't dump.** Information animates in gently and is phrased in plain
   language. Numbers feel earned.
4. **Calm motion.** Soft fades and rises (200–500ms, ease-out). Nothing bounces
   for attention. Loading feels like breathing, not spinning.
5. **Premium restraint.** Lots of negative space. One accent colour. Quiet
   secondary actions. Type does the heavy lifting.
6. **Honest by design.** Real measured numbers, gently labelled
   "measured on this machine."

## Visual language

- **Backdrop:** a soft sky gradient with two or three very slow, blurred orbs
  drifting — the "calm sky" feeling, never distracting.
- **Surfaces:** frosted glass cards, large radii (~24px), soft shadows.
- **Accent:** a single friendly sky blue. Success uses a gentle emerald, sparingly.
- **Type:** Inter. Big, confident headlines with tight tracking; soft ink body text.
- **Chrome:** a slim segmented progress bar at the very top and a quiet back
  affordance — both hidden on the Welcome and Results screens so those feel like
  destinations, not steps.

---

## The journey (8 screens)

### 0 · Welcome
**Goal:** set the tone and earn one tap.
- Brand mark, a confident headline ("Local AI, perfectly tuned for *your* Mac/PC"),
  one calm sentence of value, and three tiny reassurances (Private · No terminal ·
  Honest results).
- Single primary button: **Get started**. No progress bar, no back.

### 1 · Scanning  *(loading state, done right)*
**Goal:** turn a data fetch into a moment.
- Full-screen, centered. A gentle pulsing scanner animation over the brand mark.
- Rotating reassuring copy: "Getting to know your computer…" → "Checking memory and
  graphics…".
- In the background we prefetch hardware, Ollama status, and the recommendation in
  parallel, so every later screen is instant.
- Auto-advances once data is ready **and** a minimum dwell (~2s) has passed, so the
  moment never feels skipped. If the local service can't be reached, it calmly
  offers **Try again**.

### 2 · Your computer  *(hardware detection)*
**Goal:** "it understands my machine."
- Headline: "Here's your machine." One plain-language summary sentence.
- Four soft stat tiles animate in with a slight stagger: System · Processor ·
  Memory · Graphics. A couple of quiet pills (cores, Apple Silicon / NVIDIA).
- Primary: **Looks good →**.

### 3 · Recommendation
**Goal:** confident guidance, with a choice that doesn't overwhelm.
- Headline: "We recommend [Model]." A single hero card explains *why* in plain
  language and shows an estimated speed range (clearly labelled as an estimate).
- A quiet "or choose a lighter model" reveals the alternative. Selecting is a calm
  toggle, not a form.
- Primary: **Use this model →**.

### 4 · Setup  *(installation)*
**Goal:** remove every reason the user might get stuck.
- Three calm states, only ever one visible:
  - **Engine not found:** a friendly explainer with 3 short steps and a link to
    install Ollama, plus **Check again**. Reassuring, never an error.
  - **Model not installed:** "Let's add [Model] — about X GB." A big **Install**
    button starts a calm, breathing progress state with rotating copy
    ("Downloading…", "Setting things up…"). No raw logs.
  - **All set:** a soft check and "You're ready."
- Primary appears only when ready: **Continue →**.

### 5 · Baseline  *(benchmark)*
**Goal:** make a measurement feel like a calm experiment.
- Headline: "Let's measure your starting speed." One sentence on what we do (same
  prompt every time, real numbers).
- Primary: **Run the test**. On tap → a serene running state (a soft gauge filling /
  pulse) with copy like "Measuring…". Then the number rises into view:
  big **tok/s**, with "default settings" underneath.
- Primary: **Continue →**.

### 6 · Optimize  *(safe tuning + re-benchmark)*
**Goal:** show care, then prove it.
- Headline: "Now let's tune it for your machine." A short, human list of what we'll
  adjust (e.g. "Use your GPU to its full potential"). Honest sub-line: these are
  standard, safe Ollama settings.
- Primary: **Optimize & re-test**. On tap → apply the profile, then run the *same*
  test again with the same serene running state. The optimized number rises in.
- Primary: **See the difference →**.

### 7 · Results  *(the payoff)*
**Goal:** an honest, satisfying reveal.
- No progress bar, no back — this is a destination.
- Big improvement figure rises in (e.g. **+14%** faster), with Before / After tiles
  beneath it. Honest caption: "Measured on this machine — same prompt, same model,
  only the settings changed."
- A quiet "What changed" list. Secondary: **Start over**.
- If the gain is ~0 or negative, the copy stays honest and calm
  ("About the same on this machine — and that's okay").

---

## Motion spec (implementation guide)

| Element | Motion |
|---|---|
| Screen enter | content fades up + slight scale (`opacity 0→1`, `translateY 12px→0`, `scale .98→1`), 420ms ease-out |
| Staggered items | each child delayed 60–90ms in sequence |
| Background orbs | 18–26s slow drift loops, heavy blur, very low opacity |
| Buttons | hover lift + soft shadow; press scales to .98 |
| Running/loading | slow breathing pulse (~2.4s), never a harsh spinner |
| Number reveal | count-up feel via fade-up + scale; emphasis on the hero figure |

## Navigation model

A small forward-only state machine with optional **Back** on reveal screens
(Hardware, Recommendation, Setup, Baseline, Optimize). Welcome, Scanning, and
Results manage their own flow. **Start over** on Results resets state to Welcome.
