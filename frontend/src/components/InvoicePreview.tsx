import { useEffect, useRef, useState, type ReactNode } from "react";
import { StatusBadge } from "./StatusBadge";
import { formatDate, formatGrouped, formatMoney } from "../lib/format";
import type { InvoiceLine } from "../lib/api";

export type InvoicePreviewData = {
  invoiceNumber: string;
  clientName: string;
  clientDocument: string;
  clientEmail?: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: number;
  tax: number;
  taxPercent?: number;
  total: number;
  status?: string;
  lines?: InvoiceLine[];
};

const LINES_PER_PAGE = 5;
const PAPER_WIDTH = 520;

function fallbackLines(data: InvoicePreviewData): InvoiceLine[] {
  if (data.lines && data.lines.length > 0) {
    return data.lines;
  }

  return [
    {
      description: "Servicios profesionales",
      quantity: 1,
      unitPrice: data.subtotal || 0,
      amount: data.subtotal || 0
    }
  ];
}

function chunkLines(lines: InvoiceLine[]): InvoiceLine[][] {
  const pages: InvoiceLine[][] = [];
  for (let index = 0; index < lines.length; index += LINES_PER_PAGE) {
    pages.push(lines.slice(index, index + LINES_PER_PAGE));
  }
  return pages.length > 0 ? pages : [[]];
}

function resolvedTaxPercent(data: InvoicePreviewData): number {
  if (data.taxPercent != null && Number.isFinite(data.taxPercent)) {
    return data.taxPercent;
  }
  if (!data.subtotal) {
    return 0;
  }
  return (data.tax / data.subtotal) * 100;
}

export function PrintSoonButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      disabled
      title="Imprimir"
      className={`inline-flex items-center gap-2 rounded-full bg-white/90 px-3.5 py-2.5 text-sm font-medium text-zinc-400 shadow-float ring-1 ring-zinc-200/80 backdrop-blur-md ${className}`}
    >
      <PrinterIcon />
      Próximamente
    </button>
  );
}

export function InvoicePreview({ data }: { data: InvoicePreviewData }) {
  const currency = data.currency || "COP";
  const pages = chunkLines(fallbackLines(data));
  const taxPercent = resolvedTaxPercent(data);

  return (
    <div className="mx-auto w-full max-w-[520px] space-y-8">
      {pages.map((pageLines, pageIndex) => {
        const isLast = pageIndex === pages.length - 1;
        return (
          <PaperSheet key={pageIndex} label={`Hoja ${pageIndex + 1} de ${pages.length}`}>
            <SheetHeader data={data} page={pageIndex + 1} pageCount={pages.length} />

            <section className="mt-8 grid grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">De</p>
                <p className="mt-1 font-medium">InvoiceHub</p>
                <p className="text-zinc-500">analyst@invoicehub.local</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">Para</p>
                <p className="mt-1 font-medium">{data.clientName || "Cliente"}</p>
                <p className="text-zinc-500">{data.clientDocument || "Documento"}</p>
                {data.clientEmail ? <p className="text-zinc-500">{data.clientEmail}</p> : null}
              </div>
            </section>

            <table className="mt-8 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                  <th className="pb-2 font-medium">Concepto</th>
                  <th className="pb-2 text-right font-medium">Cant.</th>
                  <th className="pb-2 text-right font-medium">Importe</th>
                </tr>
              </thead>
              <tbody>
                {pageLines.map((line, lineIndex) => (
                  <tr key={`${pageIndex}-${lineIndex}`} className="border-b border-zinc-100">
                    <td className="py-3 pr-3">
                      <p className="font-medium">{line.description || "Concepto"}</p>
                      <p className="mt-0.5 text-xs text-zinc-400">
                        {formatMoney(line.unitPrice, currency)} c/u
                      </p>
                    </td>
                    <td className="py-3 text-right tabular-nums text-zinc-500">{line.quantity}</td>
                    <td className="py-3 text-right tabular-nums">{formatMoney(line.amount, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-auto pt-8">
              {isLast ? (
                <dl className="ml-auto w-72 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-4 text-zinc-500">
                    <dt className="shrink-0">Subtotal</dt>
                    <dd className="whitespace-nowrap tabular-nums">{formatMoney(data.subtotal || 0, currency)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 text-zinc-500">
                    <dt className="shrink-0">Impuesto ({formatGrouped(taxPercent, "USD")}%)</dt>
                    <dd className="whitespace-nowrap tabular-nums">{formatMoney(data.tax || 0, currency)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-zinc-200 pt-2 font-semibold">
                    <dt className="shrink-0">Total</dt>
                    <dd className="whitespace-nowrap tabular-nums">{formatMoney(data.total || 0, currency)}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-right text-xs text-zinc-400">Continúa en la hoja {pageIndex + 2} →</p>
              )}
            </div>
          </PaperSheet>
        );
      })}
    </div>
  );
}

function PaperSheet({ label, children }: { label: string; children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(736);

  useEffect(() => {
    const frame = frameRef.current;
    const paper = paperRef.current;
    if (!frame || !paper) {
      return;
    }

    const update = () => {
      const next = Math.min(1, frame.clientWidth / PAPER_WIDTH);
      setScale(next);
      setHeight(paper.offsetHeight * next);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    observer.observe(paper);
    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <div ref={frameRef} className="overflow-hidden" style={{ height }}>
        <article
          ref={paperRef}
          className="ih-paper"
          style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          {children}
        </article>
      </div>
    </div>
  );
}

function SheetHeader({
  data,
  page,
  pageCount
}: {
  data: InvoicePreviewData;
  page: number;
  pageCount: number;
}) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <div className="grid h-10 w-10 place-items-center rounded-md bg-zinc-900 text-[11px] font-semibold text-white">
          IH
        </div>
        <p className="mt-3 text-lg font-semibold tracking-tight">InvoiceHub</p>
      </div>
      <div className="text-right text-xs text-zinc-500">
        <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">Factura</p>
        <p className="mt-1 font-medium text-zinc-900">{data.invoiceNumber || "INV-····"}</p>
        <p className="mt-3">Emisión: {data.issueDate ? formatDate(data.issueDate) : "—"}</p>
        <p>Vence: {data.dueDate ? formatDate(data.dueDate) : "—"}</p>
        {pageCount > 1 ? (
          <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-zinc-400">
            Pág. {page} de {pageCount}
          </p>
        ) : null}
        {data.status ? (
          <div className="mt-3 flex justify-end">
            <StatusBadge status={data.status} />
          </div>
        ) : null}
      </div>
    </header>
  );
}

function PrinterIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M6 7V3.5h8V7M6 14.5H4.5A1.5 1.5 0 0 1 3 13V9.5A1.5 1.5 0 0 1 4.5 8h11A1.5 1.5 0 0 1 17 9.5V13a1.5 1.5 0 0 1-1.5 1.5H14M6 12h8v5H6v-5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
