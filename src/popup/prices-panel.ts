import type { PriceHistory } from "../types/items.ts";
import { sendMessage } from "../utils/messages.ts";
import { formatTimestamp } from "../utils/time.ts";
import { el, clearChildren } from "./dom-builder.ts";

function drawSparkline(canvas: HTMLCanvasElement, prices: readonly number[]): void {
  const ctx = canvas.getContext("2d");
  if (!ctx || prices.length < 2) return;

  const width = canvas.width;
  const height = canvas.height;
  const padding = 2;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "#7c3aed";
  ctx.lineWidth = 1.5;
  ctx.beginPath();

  for (let i = 0; i < prices.length; i++) {
    const x = padding + (i / (prices.length - 1)) * (width - padding * 2);
    const price = prices[i];
    if (price === undefined) continue;
    const y = height - padding - ((price - min) / range) * (height - padding * 2);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();
}

function renderPriceCard(history: PriceHistory): HTMLElement {
  const lastSnapshot = history.snapshots[history.snapshots.length - 1];
  const priceChange = history.snapshots.length >= 2
    ? history.currentPrice - (history.snapshots[history.snapshots.length - 2]?.price ?? history.currentPrice)
    : 0;

  const changeText = priceChange > 0
    ? `+${String(priceChange)}`
    : priceChange < 0
      ? String(priceChange)
      : "0";

  const canvas = el("canvas", {
    className: "sparkline",
    attributes: { width: "340", height: "30" },
  });

  // Schedule sparkline drawing after DOM insertion
  requestAnimationFrame(() => {
    drawSparkline(canvas, history.snapshots.map((s) => s.price));
  });

  return el("div", {
    className: "card",
    children: [
      el("div", {
        className: "card__header",
        children: [
          el("span", { className: "card__title", textContent: history.itemName }),
          el("span", {
            className: "card__subtitle",
            textContent: lastSnapshot ? formatTimestamp(lastSnapshot.timestamp) : "",
          }),
        ],
      }),
      el("div", {
        className: "card__header",
        children: [
          el("span", {
            className: "card__value",
            textContent: `${String(history.currentPrice)} pesetas`,
          }),
          el("span", {
            className: "card__subtitle",
            textContent: changeText,
          }),
        ],
      }),
      canvas,
      el("div", {
        className: "card__subtitle",
        textContent: `Min: ${String(history.minPrice)} / Max: ${String(history.maxPrice)}`,
      }),
    ],
  });
}

function renderEmpty(): HTMLElement {
  return el("div", {
    className: "empty-state",
    children: [
      el("div", { className: "empty-state__text", textContent: "No price data yet" }),
      el("p", {
        className: "empty-state__text",
        textContent: "Visit a shop or mercadillo in Berrus to start tracking prices.",
      }),
    ],
  });
}

export async function renderPricesPanel(panel: HTMLElement): Promise<void> {
  clearChildren(panel);
  panel.appendChild(el("div", { className: "loading", textContent: "Loading prices..." }));

  const result = await sendMessage({ type: "GET_PRICES" });
  clearChildren(panel);

  if (!result.ok) {
    panel.appendChild(el("div", { className: "empty-state", children: [
      el("div", { className: "empty-state__text", textContent: "Could not load prices" }),
    ]}));
    return;
  }

  const histories = result.value;

  if (histories.length === 0) {
    panel.appendChild(renderEmpty());
    return;
  }

  for (const history of histories) {
    panel.appendChild(renderPriceCard(history));
  }
}
