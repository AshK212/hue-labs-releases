// PNG export for the result card — a single, centralized implementation.
//
// No third-party library is used (none is installed): the card is styled with
// inline styles, so we can serialize its DOM node into an SVG <foreignObject>,
// rasterize that onto a canvas, and read a PNG blob back out. Every public
// function routes through the one `nodeToPngBlob` core, so export logic is never
// duplicated. If a library (e.g. html-to-image) is added later, swap only the
// core — the public API stays the same.

import type { ResultCardData } from "./types";

/** Device-scale factor for crisp, retina-quality output. */
const DEFAULT_SCALE = 2;

/** Serialize a DOM node into a self-contained SVG data URL. */
function nodeToSvgDataUrl(node: HTMLElement, width: number, height: number): string {
  const clone = node.cloneNode(true) as HTMLElement;
  clone.style.margin = "0";
  const serialized = new XMLSerializer().serializeToString(clone);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject width="100%" height="100%">` +
    `<div xmlns="http://www.w3.org/1999/xhtml">${serialized}</div>` +
    `</foreignObject></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/** Core: rasterize a node to a PNG Blob. Everything else builds on this. */
async function nodeToPngBlob(node: HTMLElement, scale = DEFAULT_SCALE): Promise<Blob> {
  const rect = node.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height));

  const image = new Image();
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Failed to render the result card image."));
  });
  image.src = nodeToSvgDataUrl(node, width, height);
  await loaded;

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context is unavailable.");
  ctx.scale(scale, scale);
  ctx.drawImage(image, 0, 0);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode PNG."))),
      "image/png"
    );
  });
}

/** A safe, descriptive PNG filename derived from the card data. */
export function defaultFileName(data: ResultCardData): string {
  const slug = data.model.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
  return `hue-labs-${slug || "result"}.png`;
}

/** Export the card node as a PNG Blob (for callers that manage the blob). */
export async function exportToPNG(node: HTMLElement, scale = DEFAULT_SCALE): Promise<Blob> {
  return nodeToPngBlob(node, scale);
}

/** Copy the rendered card to the clipboard as a PNG image. */
export async function copyToClipboard(node: HTMLElement): Promise<void> {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
    throw new Error("Copying images to the clipboard isn't supported here.");
  }
  const blob = await nodeToPngBlob(node);
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

/** Trigger a PNG download of the rendered card. */
export async function savePNG(node: HTMLElement, filename = "hue-labs-result.png"): Promise<void> {
  const blob = await nodeToPngBlob(node);
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
