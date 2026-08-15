export function moneyFractionDigits(currency: string): number {
  return currency === "COP" ? 0 : 2;
}

export function formatGrouped(amount: number, currency = "COP"): string {
  const digits = moneyFractionDigits(currency);
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function parseGrouped(raw: string, currency = "COP"): number {
  const trimmed = raw.trim();
  if (!trimmed) {
    return 0;
  }

  const digits = moneyFractionDigits(currency);
  if (digits === 0) {
    const only = trimmed.replace(/\D/g, "");
    return only ? Number(only) : 0;
  }

  const lastComma = trimmed.lastIndexOf(",");
  const lastDot = trimmed.lastIndexOf(".");
  const decimalAt = Math.max(lastComma, lastDot);
  const hasDecimal = decimalAt >= 0 && trimmed.slice(decimalAt + 1).replace(/\D/g, "").length > 0;

  if (hasDecimal) {
    const intPart = trimmed.slice(0, decimalAt).replace(/\D/g, "") || "0";
    const frac = trimmed.slice(decimalAt + 1).replace(/\D/g, "").slice(0, digits);
    return Number(`${intPart}.${frac}`);
  }

  const only = trimmed.replace(/\D/g, "");
  return only ? Number(only) : 0;
}

export function formatMoney(amount: number, currency: string): string {
  const symbol = currencySymbol(currency);
  return `${symbol} ${formatGrouped(amount, currency)}`;
}

export function currencySymbol(currency: string): string {
  switch (currency) {
    case "USD":
      return "US$";
    case "EUR":
      return "€";
    default:
      return "$";
  }
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) {
    return isoDate;
  }
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(year, month - 1, day));
}

export function fieldError(
  errors: Record<string, string[]> | undefined,
  ...names: string[]
): string | undefined {
  if (!errors) {
    return undefined;
  }
  const lookup = Object.fromEntries(Object.entries(errors).map(([key, value]) => [key.toLowerCase(), value]));
  for (const name of names) {
    const messages = lookup[name.toLowerCase()];
    if (messages?.[0]) {
      return messages[0];
    }
  }
  return undefined;
}
