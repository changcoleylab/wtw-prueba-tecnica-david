const STATUS_LABELS: Record<string, string> = {
  Draft: "Borrador",
  Issued: "Emitida",
  Paid: "Pagada",
  Cancelled: "Anulada",
  Overdue: "Vencida"
};

const tones: Record<string, string> = {
  Draft: "bg-zinc-100 text-zinc-600",
  Issued: "bg-zinc-900 text-white",
  Paid: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-rose-50 text-rose-700",
  Overdue: "bg-amber-50 text-amber-800"
};

export const INVOICE_STATUSES = [
  { value: "Issued", label: "Emitida" },
  { value: "Paid", label: "Pagada" },
  { value: "Cancelled", label: "Anulada" },
  { value: "Overdue", label: "Vencida" }
] as const;

function statusKey(status: string): string | undefined {
  const normalized = status.trim().toLowerCase();
  return Object.keys(STATUS_LABELS).find((key) => key.toLowerCase() === normalized);
}

export function statusLabel(status: string): string {
  const key = statusKey(status);
  return key ? STATUS_LABELS[key] : status;
}

export function StatusBadge({ status }: { status: string }) {
  const key = statusKey(status);
  const tone = (key && tones[key]) || "bg-zinc-100 text-zinc-600";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>{statusLabel(status)}</span>
  );
}
