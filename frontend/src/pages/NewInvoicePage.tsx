import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DatePicker } from "../components/DatePicker";
import { InvoicePreview, PrintSoonButton } from "../components/InvoicePreview";
import { PageTrail } from "../components/PageTrail";
import { SelectMenu } from "../components/SelectMenu";
import {
  ApiError,
  createInvoice,
  friendlyApiMessage,
  invoiceNumberExists,
  type CreateInvoiceRequest,
  type InvoiceLine
} from "../lib/api";
import { fieldError, formatGrouped, moneyFractionDigits, parseGrouped } from "../lib/format";

type LineDraft = {
  key: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

function todayIso(): string {
  return localIso(new Date());
}

function plusDaysIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localIso(date);
}

function localIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function newLine(partial?: Partial<LineDraft>): LineDraft {
  return {
    key: crypto.randomUUID(),
    description: partial?.description ?? "",
    quantity: partial?.quantity ?? "1",
    unitPrice: partial?.unitPrice ?? "0"
  };
}

function defaultForm() {
  const stamp = Date.now().toString();
  return {
    clientName: "Initech",
    clientDocument: `9${stamp.slice(-8)}`,
    clientEmail: "ap@initech.test",
    invoiceNumber: `INV-${new Date().getFullYear()}-${stamp.slice(-5)}`,
    issueDate: todayIso(),
    dueDate: plusDaysIso(30),
    currency: "COP",
    taxPercent: "19",
    lines: [
      newLine({ description: "Servicios profesionales", quantity: "1", unitPrice: "1000000" })
    ]
  };
}

function lineAmount(line: LineDraft): number {
  return (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
}

function toInvoiceLines(lines: LineDraft[]): InvoiceLine[] {
  return lines.map((line) => {
    const quantity = Number(line.quantity) || 0;
    const unitPrice = Number(line.unitPrice) || 0;
    return {
      description: line.description.trim() || "Concepto",
      quantity,
      unitPrice,
      amount: quantity * unitPrice
    };
  });
}

export function NewInvoicePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultForm);
  const [banner, setBanner] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>();
  const [pane, setPane] = useState<"datos" | "preview">("datos");
  const [debouncedNumber, setDebouncedNumber] = useState(form.invoiceNumber.trim());

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedNumber(form.invoiceNumber.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [form.invoiceNumber]);

  const numberTakenQuery = useQuery({
    queryKey: ["invoices", "exists", debouncedNumber],
    queryFn: () => invoiceNumberExists(debouncedNumber),
    enabled: debouncedNumber.length >= 3
  });
  const numberTaken = numberTakenQuery.data === true;
  const linesInvalid = form.lines.some((line) => !line.description.trim() || lineAmount(line) <= 0);
  const numberError = numberTaken
    ? "Este número de factura ya existe."
    : fieldError(fieldErrors, "invoiceNumber");

  const lines = useMemo(() => toInvoiceLines(form.lines), [form.lines]);
  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + line.amount, 0), [lines]);
  const taxPercent = Number(form.taxPercent) || 0;
  const tax = roundMoney((subtotal * taxPercent) / 100, form.currency);
  const total = subtotal + tax;

  const mutation = useMutation({
    mutationFn: (payload: CreateInvoiceRequest) => createInvoice(payload, crypto.randomUUID()),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["invoices"] });
      navigate(`/invoices/${created.id}`);
    },
    onError: (caught) => {
      if (caught instanceof ApiError) {
        if (/already exists/i.test(caught.detail ?? caught.title)) {
          setFieldErrors({
            ...caught.fieldErrors,
            invoiceNumber: ["Este número de factura ya existe."]
          });
          return;
        }
        setBanner(friendlyApiMessage(caught));
        setFieldErrors(caught.fieldErrors);
        return;
      }
      setBanner("No se pudo crear la factura.");
    }
  });

  function set<K extends keyof ReturnType<typeof defaultForm>>(key: K, value: ReturnType<typeof defaultForm>[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function patchLine(key: string, patch: Partial<LineDraft>) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.key === key ? { ...line, ...patch } : line))
    }));
  }

  function addLine() {
    setForm((current) => ({ ...current, lines: [...current.lines, newLine()] }));
  }

  function removeLine(key: string) {
    setForm((current) => ({
      ...current,
      lines: current.lines.length === 1 ? current.lines : current.lines.filter((line) => line.key !== key)
    }));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (numberTaken || linesInvalid) {
      return;
    }
    setBanner(null);
    setFieldErrors(undefined);
    mutation.mutate({
      clientName: form.clientName.trim(),
      clientDocument: form.clientDocument.trim(),
      clientEmail: form.clientEmail.trim() || undefined,
      invoiceNumber: form.invoiceNumber.trim(),
      issueDate: form.issueDate,
      dueDate: form.dueDate,
      currency: form.currency,
      subtotal,
      tax,
      total,
      lines
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageTrail items={[{ label: "Facturas", to: "/" }, { label: "Nueva factura" }]} />
        <div className="flex shrink-0 gap-2 self-end sm:self-auto">
          <Link
            to="/"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            form="new-invoice-form"
            disabled={mutation.isPending || numberTaken || linesInvalid}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {mutation.isPending ? "Guardando…" : "Crear"}
          </button>
        </div>
      </div>

      {banner && !/ya existe/i.test(banner) ? (
        <div className="mt-3 shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {banner}
        </div>
      ) : null}

      <div className="relative mt-5 min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full min-h-0 flex-col lg:grid lg:grid-cols-2 lg:gap-6">
          <form
            id="new-invoice-form"
            className={`ih-form-pane ih-scroll min-h-0 flex-1 space-y-4 overflow-y-auto max-lg:pb-20 ${
              pane === "preview" ? "is-hidden" : ""
            }`}
            onSubmit={onSubmit}
          >
            <section className="ih-card">
              <h2 className="ih-card-title">Cliente</h2>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <Field
                  className="col-span-2"
                  label="Nombre"
                  value={form.clientName}
                  onChange={(value) => set("clientName", value)}
                  error={fieldError(fieldErrors, "clientName")}
                />
                <Field
                  label="Documento"
                  value={form.clientDocument}
                  onChange={(value) => set("clientDocument", value)}
                  error={fieldError(fieldErrors, "clientDocument")}
                />
                <Field
                  label="Email"
                  value={form.clientEmail}
                  onChange={(value) => set("clientEmail", value)}
                  error={fieldError(fieldErrors, "clientEmail")}
                />
              </div>
            </section>

            <section className="ih-card">
              <h2 className="ih-card-title">Factura</h2>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <Field
                  className="col-span-2 sm:col-span-1"
                  label="Número"
                  value={form.invoiceNumber}
                  onChange={(value) => set("invoiceNumber", value)}
                  error={numberError}
                />
                <SelectField
                  label="Moneda"
                  value={form.currency}
                  onChange={(value) => set("currency", value)}
                  options={[
                    { value: "COP", label: "COP" },
                    { value: "USD", label: "USD" },
                    { value: "EUR", label: "EUR" }
                  ]}
                />
                <DateField
                  label="Emisión"
                  value={form.issueDate}
                  onChange={(value) => set("issueDate", value)}
                  error={fieldError(fieldErrors, "issueDate")}
                />
                <DateField
                  label="Vencimiento"
                  value={form.dueDate}
                  onChange={(value) => set("dueDate", value)}
                  error={fieldError(fieldErrors, "dueDate")}
                />
              </div>
            </section>

            <section className="ih-card">
              <div className="flex items-center justify-between gap-3">
                <h2 className="ih-card-title">Conceptos</h2>
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500">
                  {form.lines.length}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {form.lines.map((line, index) => (
                  <article key={line.key} className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">
                        Concepto {index + 1}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        disabled={form.lines.length === 1}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-400 hover:bg-white hover:text-rose-600 disabled:opacity-30"
                      >
                        Quitar
                      </button>
                    </div>
                    <label className="mt-3 block">
                      <span className="ih-label">Descripción</span>
                      <input
                        value={line.description}
                        onChange={(event) => patchLine(line.key, { description: event.target.value })}
                        className="ih-input"
                        placeholder="Ej. Consultoría agosto"
                      />
                    </label>
                    <div className="mt-3 grid grid-cols-[4.5rem_1fr] gap-3 sm:grid-cols-[6.5rem_1fr]">
                      <Field
                        label="Cant."
                        type="number"
                        value={line.quantity}
                        onChange={(value) => patchLine(line.key, { quantity: value })}
                      />
                      <MoneyField
                        label="Precio"
                        value={line.unitPrice}
                        currency={form.currency}
                        onChange={(value) => patchLine(line.key, { unitPrice: value })}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2.5 ring-1 ring-zinc-200/80">
                      <span className="text-xs text-zinc-500">Importe</span>
                      <span className="text-sm font-semibold tabular-nums">
                        {formatGrouped(lineAmount(line), form.currency)} {form.currency}
                      </span>
                    </div>
                    {!line.description.trim() || lineAmount(line) <= 0 ? (
                      <p className="mt-2 text-xs text-rose-600">Cada concepto necesita descripción e importe mayor a 0.</p>
                    ) : null}
                  </article>
                ))}
              </div>

              <button
                type="button"
                onClick={addLine}
                className="mt-3 w-full rounded-2xl border border-dashed border-zinc-300 bg-white px-3 py-3 text-sm font-medium text-zinc-600 hover:border-zinc-400 hover:text-zinc-900"
              >
                + Añadir concepto
              </button>
            </section>

            <section className="ih-card">
              <h2 className="ih-card-title">Totales</h2>
              <div className="mt-4 grid grid-cols-1 gap-3">
                <MoneyField label="Subtotal" value={String(subtotal)} currency={form.currency} readOnly />
                <div className="grid grid-cols-2 gap-3">
                  <PercentField
                    label="Impuesto"
                    value={form.taxPercent}
                    onChange={(value) => set("taxPercent", value)}
                    error={fieldError(fieldErrors, "tax")}
                  />
                  <MoneyField label="Valor impuesto" value={String(tax)} currency={form.currency} readOnly />
                </div>
                <MoneyField label="Total" value={String(total)} currency={form.currency} readOnly emphasis />
              </div>
            </section>
          </form>

          <aside
            className={`ih-preview-slide relative flex min-h-0 flex-col overflow-hidden bg-zinc-100 max-lg:absolute max-lg:inset-0 max-lg:z-20 max-lg:rounded-none max-lg:bg-zinc-100 lg:rounded-[24px] ${
              pane === "preview" ? "is-open" : ""
            }`}
          >
            <div className="ih-scroll min-h-0 flex-1 overflow-y-auto p-5 max-lg:pb-24 md:p-8">
              <p className="mb-4 hidden text-xs font-medium uppercase tracking-[0.16em] text-zinc-400 lg:block">
                Vista previa
              </p>
              <InvoicePreview
                data={{
                  invoiceNumber: form.invoiceNumber,
                  clientName: form.clientName,
                  clientDocument: form.clientDocument,
                  clientEmail: form.clientEmail,
                  issueDate: form.issueDate,
                  dueDate: form.dueDate,
                  currency: form.currency,
                  subtotal,
                  tax,
                  taxPercent,
                  total,
                  lines
                }}
              />
            </div>
          </aside>
        </div>

        <PrintSoonButton
          className={`absolute z-20 right-3 bottom-20 lg:bottom-6 lg:right-6 ${
            pane === "preview" ? "" : "max-lg:hidden"
          }`}
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center lg:hidden">
          <div className="pointer-events-auto flex rounded-full bg-white/90 p-1 text-sm shadow-float ring-1 ring-zinc-200/80 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setPane("datos")}
              className={`rounded-full px-4 py-1.5 ${pane === "datos" ? "bg-zinc-900 text-white" : "text-zinc-500"}`}
            >
              Datos
            </button>
            <button
              type="button"
              onClick={() => setPane("preview")}
              className={`rounded-full px-4 py-1.5 ${pane === "preview" ? "bg-zinc-900 text-white" : "text-zinc-500"}`}
            >
              Vista previa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  type = "text",
  className = ""
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="ih-label">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="ih-input" />
      {error ? <span className="mt-1 block text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
  error
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="ih-label">{label}</span>
      <div className="mt-1.5">
        <DatePicker value={value} onChange={onChange} />
      </div>
      {error ? <span className="mt-1 block text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="ih-label">{label}</span>
      <div className="mt-1.5">
        <SelectMenu value={value} onChange={onChange} options={options} />
      </div>
    </label>
  );
}

function roundMoney(amount: number, currency: string): number {
  const digits = moneyFractionDigits(currency);
  const factor = 10 ** digits;
  return Math.round((Number.isFinite(amount) ? amount : 0) * factor) / factor;
}

function PercentField({
  label,
  value,
  onChange,
  error
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(value);
  const percent = Number(value) || 0;
  const display = focused ? draft : formatGrouped(percent, "USD");

  return (
    <label className="block">
      <span className="ih-label">{label}</span>
      <span className="ih-money-wrap">
        <input
          inputMode="decimal"
          value={display}
          onFocus={() => {
            setDraft(value.replace(".", ","));
            setFocused(true);
          }}
          onBlur={() => {
            onChange(String(parseGrouped(draft, "USD")));
            setFocused(false);
          }}
          onChange={(event) => setDraft(event.target.value)}
          className="ih-input ih-money"
        />
        <span className="ih-money-currency">%</span>
      </span>
      {error ? <span className="mt-1 block text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}

function MoneyField({
  label,
  value,
  currency,
  onChange,
  readOnly = false,
  emphasis = false,
  error
}: {
  label: string;
  value: string;
  currency: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  emphasis?: boolean;
  error?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(value);
  const amount = Number(value) || 0;
  const display = focused && !readOnly ? draft : formatGrouped(amount, currency);

  return (
    <label className="block">
      <span className="ih-label">{label}</span>
      <span className="ih-money-wrap">
        <input
          inputMode="decimal"
          readOnly={readOnly}
          value={display}
          onFocus={() => {
            setDraft(value.replace(".", ","));
            setFocused(true);
          }}
          onBlur={() => {
            onChange?.(String(parseGrouped(draft, currency)));
            setFocused(false);
          }}
          onChange={(event) => setDraft(event.target.value)}
          className={`ih-input ih-money ${readOnly ? "bg-zinc-50 text-zinc-600" : ""} ${
            emphasis ? "font-semibold text-zinc-900" : ""
          }`}
        />
        <span className="ih-money-currency">{currency}</span>
      </span>
      {error ? <span className="mt-1 block text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}
