// Turn the backend's technical "changed_settings" strings into friendly, human
// labels for the UI. The precise technical details still live in the docs and
// the API response; we just keep the main screens calm and non-technical.

export function friendlySetting(setting: string): string {
  const s = setting.toLowerCase();

  if (s.includes("num_gpu") || s.includes("gpu") || s.includes("graphics") || s.includes("layer")) {
    return "Use your graphics card more";
  }
  if (s.includes("num_batch") || s.includes("batch")) {
    return "Handle larger text batches more efficiently";
  }
  if (s.includes("num_thread") || s.includes("thread") || s.includes("core") || s.includes("processor")) {
    return "Match the work to your processor's cores";
  }

  // Fallback: drop any parenthetical technical detail, keep the plain words.
  return setting.replace(/\s*\([^)]*\)\s*/g, " ").trim();
}
