import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { FieldPopover, useDesktop } from "../components/FieldPopover";
import { PageTrail } from "../components/PageTrail";
import { SelectMenu } from "../components/SelectMenu";
import { INVOICE_STATUSES, StatusBadge } from "../components/StatusBadge";
import { ApiError, listInvoices, searchInvoices, type Invoice } from "../lib/api";
import { formatDate, formatMoney, parseGrouped } from "../lib/format";

type Filters = {
  status: string;
  currency: string;
  client: string;
  minAmount: string;
  maxAmount: string;
};

const emptyFilters: Filters = { status: "", currency: "", client: "", minAmount: "", maxAmount: "" };
const CURRENCIES = ["COP", "USD", "EUR"] as const;

function activeFilterCount(filters: Filters): number {
  return [filters.status, filters.currency, filters.client.trim(), filters.minAmount.trim(), filters.maxAmount.trim()].filter(
    Boolean
  ).length;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const desktop = useDesktop();
  const [draftFilters, setDraftFilters] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);

  const listQuery = useQuery({
    queryKey: ["invoices", "list"],
    queryFn: () => listInvoices(1, 50),
    enabled: query.length === 0
  });

  const searchQuery = useQuery({
    queryKey: ["invoices", "search", query],
    queryFn: () => searchInvoices(query),
    enabled: query.length > 0
  });

  const invoices: Invoice[] = query.length > 0 ? searchQuery.data ?? [] : listQuery.data?.items ?? [];
  const loading = query.length > 0 ? searchQuery.isPending : listQuery.isPending;
  const error = (query.length > 0 ? searchQuery.error : listQuery.error) as ApiError | null;

  const visible = useMemo(() => {
    const min = applied.minAmount.trim() ? parseGrouped(applied.minAmount) : null;
    const max = applied.maxAmount.trim() ? parseGrouped(applied.maxAmount) : null;
    const client = applied.client.trim().toLowerCase();

    return invoices.filter((row) => {
      if (applied.status && row.status !== applied.status) {
        return false;
      }
      if (applied.currency && row.currency !== applied.currency) {
        return false;
      }
      if (client && !row.clientName.toLowerCase().includes(client)) {
        return false;
      }
      if (min != null && min > 0 && row.total < min) {
        return false;
      }
      if (max != null && max > 0 && row.total > max) {
        return false;
      }
      return true;
    });
  }, [invoices, applied]);

  const kpis = useMemo(() => {
    const min = applied.minAmount.trim() ? parseGrouped(applied.minAmount) : null;
    const max = applied.maxAmount.trim() ? parseGrouped(applied.maxAmount) : null;
    const client = applied.client.trim().toLowerCase();
    const pool = invoices.filter((row) => {
      if (applied.currency && row.currency !== applied.currency) {
        return false;
      }
      if (client && !row.clientName.toLowerCase().includes(client)) {
        return false;
      }
      if (min != null && min > 0 && row.total < min) {
        return false;
      }
      if (max != null && max > 0 && row.total > max) {
        return false;
      }
      return true;
    });

    return [
      {
        value: "",
        label: "Todas",
        count: loading ? "…" : String(pool.length),
        active: applied.status === ""
      },
      ...INVOICE_STATUSES.map((item) => ({
        ...item,
        count: loading ? "…" : String(pool.filter((row) => row.status === item.value).length),
        active: applied.status === item.value
      }))
    ];
  }, [invoices, applied.client, applied.currency, applied.minAmount, applied.maxAmount, applied.status, loading]);

  const filterCount = activeFilterCount(applied);

  useEffect(() => {
    if (!filtersOpen) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFiltersOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtersOpen]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    setQuery(draft.trim());
  }

  function applyFilters() {
    setApplied(draftFilters);
    setDraft(draftFilters.client);
    setQuery(draftFilters.client.trim());
    setFiltersOpen(false);
  }

  function clearFilters() {
    setDraftFilters(emptyFilters);
    setApplied(emptyFilters);
    setDraft("");
    setQuery("");
    setFiltersOpen(false);
  }

  function filterByStatus(status: string) {
    const next = { ...applied, status: applied.status === status ? "" : status };
    setApplied(next);
    setDraftFilters(next);
    setFiltersOpen(false);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4">
        <PageTrail items={[{ label: "Facturas" }]} />
        <Link
          to="/invoices/new"
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Nueva factura
        </Link>
      </header>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-3">
        <section className="hidden lg:order-2 lg:flex lg:shrink-0 lg:gap-3">
          {kpis.map((kpi) => (
            <button
              key={kpi.value}
              type="button"
              onClick={() => filterByStatus(kpi.value)}
              className={`flex h-[42px] items-center justify-center gap-1.5 rounded-full border px-2.5 lg:justify-start lg:gap-2 lg:px-3.5 ${
                kpi.active
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-zinc-50 text-zinc-900 hover:border-zinc-300"
              }`}
            >
              <span className={`text-xs ${kpi.active ? "text-zinc-300" : "text-zinc-500"}`}>{kpi.label}</span>
              <span className="text-sm font-semibold">{kpi.count}</span>
            </button>
          ))}
        </section>

        <form className="flex min-w-0 flex-1 flex-wrap items-center gap-2 lg:order-1 lg:flex-nowrap" onSubmit={onSearch}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Buscar cliente… (ej. Acme)"
          className="ih-input mt-0 h-[42px] min-w-0 flex-1"
        />
        <div className="relative shrink-0">
          <button
            ref={filterBtnRef}
            type="button"
            onClick={() => {
              setDraftFilters(applied);
              setFiltersOpen((open) => !open);
            }}
            className={`relative grid h-[42px] w-[42px] place-items-center rounded-full border text-zinc-600 hover:bg-zinc-50 ${
              filterCount > 0 ? "border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800" : "border-zinc-200"
            }`}
            title="Filtros"
            aria-label="Filtros"
            aria-expanded={filtersOpen}
          >
            <FilterIcon />
            {filterCount > 0 ? (
              <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-white text-[10px] font-semibold text-zinc-900 ring-1 ring-zinc-200">
                {filterCount}
              </span>
            ) : null}
          </button>
          {filtersOpen && desktop ? (
            <FieldPopover
              open
              onClose={() => setFiltersOpen(false)}
              anchorRef={filterBtnRef}
              width={320}
              estimatedHeight={380}
              panelClassName="p-4"
            >
              <p className="text-sm font-semibold text-zinc-900">Filtros</p>
              <FilterFields values={draftFilters} onChange={setDraftFilters} showStatus={false} />
              <FilterActions onClear={clearFilters} onApply={applyFilters} />
            </FieldPopover>
          ) : null}
          {filtersOpen && !desktop
            ? createPortal(
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-[60] bg-zinc-900/40"
                    aria-label="Cerrar filtros"
                    onClick={() => setFiltersOpen(false)}
                  />
                  <div className="fixed inset-x-0 bottom-0 z-[70] rounded-t-[28px] bg-white px-5 pb-8 pt-4 shadow-float">
                    <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-200" />
                    <p className="text-base font-semibold text-zinc-900">Filtros</p>
                    <FilterFields values={draftFilters} onChange={setDraftFilters} showStatus />
                    <FilterActions onClear={clearFilters} onApply={applyFilters} />
                  </div>
                </>,
                document.body
              )
            : null}
        </div>
        <button type="submit" className="h-[42px] shrink-0 rounded-full bg-zinc-900 px-4 text-sm font-medium text-white">
          Buscar
        </button>
        {query || filterCount ? (
          <button type="button" className="h-[42px] shrink-0 rounded-full px-3 text-sm text-zinc-500 hover:text-zinc-900" onClick={clearFilters}>
            Limpiar
          </button>
        ) : null}
        </form>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-600">{error.detail ?? error.title}</p> : null}

      <div className="mt-4 min-h-0 flex-1 overflow-auto">
        {loading ? (
          <p className="px-1 py-8 text-sm text-zinc-500">Cargando…</p>
        ) : visible.length === 0 ? (
          <p className="px-1 py-8 text-sm text-zinc-500">No hay facturas{query ? ` para “${query}”` : ""}.</p>
        ) : (
          <>
            <div className="grid gap-3 lg:hidden">
              {visible.map((row) => (
                <Link
                  key={row.id}
                  to={`/invoices/${row.id}`}
                  className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-4 shadow-sm ring-1 ring-zinc-100 transition hover:border-zinc-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold tracking-tight">{row.invoiceNumber}</p>
                      <p className="mt-1 text-sm text-zinc-500">{row.clientName}</p>
                    </div>
                    <StatusBadge status={row.status} />
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <p className="text-lg font-semibold tabular-nums">{formatMoney(row.total, row.currency)}</p>
                    <p className="text-xs text-zinc-400">{formatDate(row.issueDate)}</p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-2xl border border-zinc-200 lg:block">
              <table className="w-full table-fixed text-left text-sm">
                <colgroup>
                  <col className="w-[24%]" />
                  <col className="w-[38%]" />
                  <col className="w-[22%]" />
                  <col className="w-[16%]" />
                </colgroup>
                <thead className="bg-zinc-50 text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Invoice</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50"
                      onClick={() => navigate(`/invoices/${row.id}`)}
                    >
                      <td className="truncate px-4 py-3 font-medium">{row.invoiceNumber}</td>
                      <td className="truncate px-4 py-3 text-zinc-600">{row.clientName}</td>
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                        {formatMoney(row.total, row.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FilterFields({
  values,
  onChange,
  showStatus
}: {
  values: Filters;
  onChange: (next: Filters) => void;
  showStatus: boolean;
}) {
  function patch(partial: Partial<Filters>) {
    onChange({ ...values, ...partial });
  }

  return (
    <>
      {showStatus ? (
        <label className="mt-3 block">
          <span className="ih-label">Estado</span>
          <div className="mt-1.5">
            <SelectMenu
              value={values.status}
              onChange={(status) => patch({ status })}
              options={[{ value: "", label: "Todos" }, ...INVOICE_STATUSES]}
            />
          </div>
        </label>
      ) : null}
      <label className="mt-3 block">
        <span className="ih-label">Moneda</span>
        <div className="mt-1.5">
          <SelectMenu
            value={values.currency}
            onChange={(currency) => patch({ currency })}
            options={[{ value: "", label: "Todas" }, ...CURRENCIES.map((item) => ({ value: item, label: item }))]}
          />
        </div>
      </label>
      <label className="mt-3 block">
        <span className="ih-label">Cliente</span>
        <input
          className="ih-input"
          value={values.client}
          onChange={(event) => patch({ client: event.target.value })}
          placeholder="Nombre del cliente"
        />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="ih-label">Importe desde</span>
          <input
            className="ih-input"
            inputMode="decimal"
            value={values.minAmount}
            onChange={(event) => patch({ minAmount: event.target.value })}
            placeholder="0"
          />
        </label>
        <label className="block">
          <span className="ih-label">Importe hasta</span>
          <input
            className="ih-input"
            inputMode="decimal"
            value={values.maxAmount}
            onChange={(event) => patch({ maxAmount: event.target.value })}
            placeholder="—"
          />
        </label>
      </div>
    </>
  );
}

function FilterActions({ onClear, onApply }: { onClear: () => void; onApply: () => void }) {
  return (
    <div className="mt-4 flex justify-end gap-2">
      <button type="button" className="rounded-full px-3 py-1.5 text-sm text-zinc-500" onClick={onClear}>
        Limpiar
      </button>
      <button type="button" className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white" onClick={onApply}>
        Aplicar
      </button>
    </div>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M3.5 5h13M6 10h8M8.5 15h3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

