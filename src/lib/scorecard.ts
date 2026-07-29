import type { Breakdown, PathId } from "./model";
import { pathLabels } from "./model";

export type ScorecardInput = {
  path: PathId;
  handle: string | null;
  score: number;
  F: number;
  tau: number;
  tierTitle: string;
  highest: string;
  lowest: string;
  breakdown: Breakdown;
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const o = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + o, y);
  ctx.arcTo(x + w, y, x + w, y + h, o);
  ctx.arcTo(x + w, y + h, x, y + h, o);
  ctx.arcTo(x, y + h, x, y, o);
  ctx.arcTo(x, y, x + w, y, o);
  ctx.closePath();
}

export function drawScorecard(input: ScorecardInput): HTMLCanvasElement {
  const w = 1200;
  const h = 675;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = "#09090b";
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w * 0.5, 0, 40, w * 0.5, 0, h * 0.9);
  g.addColorStop(0, "rgba(244,244,245,0.07)");
  g.addColorStop(1, "rgba(244,244,245,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#27272a";
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, w - 48, 627);

  const labels = pathLabels(input.path);
  ctx.fillStyle = "#71717a";
  ctx.font = "500 22px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.fillText("CEL INDEX  ·  PRODUCT MODEL", 64, 80);
  ctx.fillStyle = "#f4f4f5";
  ctx.font = "600 42px Fraunces, Georgia, serif";
  ctx.fillText(labels.full, 64, 140);
  if (input.handle) {
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "500 24px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.fillText(`@${input.handle.replace(/^@/, "")}`, 64, 178);
  }
  ctx.fillStyle = "#f4f4f5";
  ctx.font = "600 140px 'IBM Plex Mono', ui-monospace, monospace";
  const score = input.score.toFixed(1);
  ctx.fillText(score, 64, 340);
  const sw = ctx.measureText(score).width;
  ctx.fillStyle = "#71717a";
  ctx.font = "500 42px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.fillText("/ 100", 64 + sw + 16, 340);
  ctx.fillStyle = "#e4e4e7";
  ctx.font = "600 36px Fraunces, Georgia, serif";
  ctx.fillText(input.tierTitle, 64, 400);

  ctx.fillStyle = "#18181b";
  roundRect(ctx, 64, 440, w - 128, 72, 12);
  ctx.fill();
  ctx.strokeStyle = "#3f3f46";
  ctx.lineWidth = 1;
  roundRect(ctx, 64, 440, w - 128, 72, 12);
  ctx.stroke();
  ctx.fillStyle = "#d4d4d8";
  ctx.font = "500 26px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.fillText("F = I · (D − S)₊ · B · σ(C) · ρ · Ψ", 88, 486);
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "400 20px 'IBM Plex Sans', system-ui, sans-serif";
  ctx.fillText(
    `F = ${input.F.toFixed(4)}   τ = ${input.tau.toFixed(2)}   max: ${input.highest}   min: ${input.lowest}`,
    64,
    560,
  );

  const factors = input.breakdown.factors;
  const barW = (1072 - 10 * (factors.length - 1)) / factors.length;
  factors.forEach((f, i) => {
    const x = 64 + i * (barW + 10);
    ctx.fillStyle = "#27272a";
    roundRect(ctx, x, 590, barW, 28, 6);
    ctx.fill();
    ctx.fillStyle = "#f4f4f5";
    const fill = Math.max(4, barW * f.value);
    roundRect(ctx, x, 590, fill, 28, 6);
    ctx.fill();
    ctx.fillStyle = "#71717a";
    ctx.font = "500 14px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.fillText(f.key, x + 8, 609);
  });

  ctx.fillStyle = "#52525b";
  ctx.font = "400 16px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.fillText("self-report · formal product · not a diagnosis", 64, 648);
  return canvas;
}

export async function downloadScorecard(
  input: ScorecardInput,
  filename?: string,
): Promise<Blob> {
  const canvas = drawScorecard(input);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `cel-index-${input.score.toFixed(1)}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return blob;
}
