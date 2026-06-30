# Design System

The shared rules that keep every screen feeling like one handcrafted app. If you
add to the UI, follow these so nothing drifts.

## Voice

Short, calm, friendly. Write the way a person would explain something to a friend,
not the way a brochure sells. A few rules we keep:

- No em dashes anywhere. Use a comma, a full stop, or a new sentence.
- No "perfect", "best", "AI powered", "next generation", or marketing phrases.
- Say what the person should do, plainly. "Continue", "Run the test", "Download".
- Be honest about numbers. "Measured on your computer", never "guaranteed".

Examples we follow:

| Instead of | We say |
|---|---|
| Here's your machine. | We found your computer. |
| Looks good | Continue |
| One quick thing to enable | Let's set up Ollama |
| Best fit | Suggested |

## Layout

- Content sits in a **left-anchored column** (max width ~33rem) inside a wide frame,
  vertically centered. The eye lands on the left, and the soft sky has room to
  breathe on the right. We avoid centering everything.
- A quiet top bar holds the brand on the left and a slim step indicator on the
  right. A back control replaces the brand when going back is allowed.
- One screen answers one question: *what does the person do right now?* Anything
  that doesn't help answer it is removed.

## Color

A cloud palette. Soft neutrals, a calm cornflower accent, a quiet sage for good news.
We avoid the default Tailwind blue.

| Token | Use |
|---|---|
| `mist-50 → 400` | Page, surfaces, hovers, faint dividers |
| `ink-900 / 700 / 500 / 400` | Headings / strong body / body / captions |
| `sky-400 / 500 / 600` | Accent, primary button, selection |
| `sage-500 / 600` | Improvement and "done" moments, used sparingly |

The page is a soft sky gradient with two slow, blurred orbs weighted to the right.

## Type

Inter, with tight tracking on large text.

| Role | Size / weight |
|---|---|
| Display (Welcome) | 42px / 600, tracking -0.025em |
| Screen title | 32–34px / 600 |
| Waiting title | 26px / 600 |
| Body | 17px / 400, ink-500 |
| Small / caption | 13–14px, ink-400 |

We do not use uppercase overlines. The headline carries the hierarchy.

## Components

- **Buttons**: one height (44px), one radius (13px), one easing. Primary is a solid
  sky fill with a soft shadow. Secondary is a light neutral fill. Ghost is text only.
- **Cards / tiles**: rounded 16–20px, white or near-white, **no borders**. Depth comes
  from soft, low shadows, never heavy ones.
- **Badges (pills)**: small, low-contrast fills, no borders.
- **Icons**: line icons at a consistent size. 18px inline and in buttons, 24px in
  icon badges, 28px for waiting marks.

## Motion

One easing language: `cubic-bezier(0.16, 1, 0.3, 1)`.

- Screen enter: content fades up 12px over ~500ms.
- Staggered items: 70ms apart.
- Waiting states: a slow breathing mark (~3s), never a hard spinner.
- Numbers: a soft pop-in. Buttons: a 1px lift on hover, a small press.
- Everything respects `prefers-reduced-motion`.

## Spacing

A 4px base. Common rhythm inside a screen: title, then `mt-3` body, then `mt-7/8`
content, then `mt-8/9` to the primary action. Keep to these so screens feel related.
