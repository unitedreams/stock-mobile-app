const CURRENCY_SYMBOLS: Record<string, string> = {
  CAD: "CA$",
  USD: "US$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  AUD: "A$",
  HKD: "HK$",
};

export function currencySymbol(currency: string | null | undefined): string {
  if (!currency) return "";
  const code = currency.toUpperCase();
  return CURRENCY_SYMBOLS[code] ?? `${code} `;
}

export function formatPrice(price: number | null, currency: string): string {
  if (price == null || !Number.isFinite(price)) return "—";
  return `${currencySymbol(currency)}${price.toLocaleString("en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPoints(points: number): string {
  const rounded = Math.round(points * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}`;
}
