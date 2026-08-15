import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { ApiError } from "../lib/api";

const DEMO_EMAIL = "analyst@invoicehub.local";
const DEMO_PASSWORD = "InvoiceHub!2026";

export function LoginPage() {
  const { session, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);

  if (session && !leaving) {
    return <Navigate to="/" replace />;
  }

  async function onEnter() {
    setError(null);
    setBusy(true);
    try {
      await login(DEMO_EMAIL, DEMO_PASSWORD);
      setLeaving(true);
      window.setTimeout(() => navigate("/", { replace: true }), 480);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail ?? caught.title : "No se pudo iniciar sesión.");
      setBusy(false);
    }
  }

  return (
    <div className={`h-full overflow-hidden bg-canvas p-4 transition-opacity duration-500 md:p-5 ${leaving ? "opacity-0" : "opacity-100"}`}>
      <div className="flex h-full items-center justify-center lg:hidden">
        <div className="w-full max-w-[22rem] rounded-[28px] bg-white p-6 shadow-float">
          <LoginPanel busy={busy} error={error} onEnter={onEnter} />
        </div>
      </div>

      <div className="relative mx-auto hidden h-full max-w-[1400px] overflow-hidden rounded-[28px] bg-white shadow-float lg:flex">
        <aside className="relative w-[48%] shrink-0 overflow-hidden bg-zinc-100">
          <p className="absolute left-8 top-8 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
            Vista previa
          </p>
          <div className="flex h-full items-center justify-center p-10">
            <LoginInvoice />
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col justify-center px-16">
          <div className="mx-auto w-full max-w-sm">
            <LoginPanel busy={busy} error={error} onEnter={onEnter} />
          </div>
        </section>
      </div>
    </div>
  );
}

function LoginPanel({
  busy,
  error,
  onEnter
}: {
  busy: boolean;
  error: string | null;
  onEnter: () => void;
}) {
  return (
    <>
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-zinc-900 text-xs font-semibold text-white">
        IH
      </div>
      <h1 className="mt-5 text-xl font-semibold tracking-tight lg:mt-6 lg:text-2xl">InvoiceHub</h1>
      <p className="mt-2 text-sm text-zinc-500">Entra al panel de demostración para emitir y revisar facturas.</p>

      <div className="mt-6 rounded-2xl bg-zinc-100 px-4 py-3 lg:mt-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">Cuenta</p>
        <p className="mt-1 truncate text-sm font-medium text-zinc-900">{DEMO_EMAIL}</p>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={onEnter}
        className="mt-5 w-full rounded-full bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {busy ? "Entrando…" : "Entrar al panel"}
      </button>
      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
    </>
  );
}

const LINES = [
  { description: "Consultoría agosto", detail: "US$ 2.400.000,00 c/u", qty: "1", amount: "US$ 2.400.000,00" },
  { description: "Soporte plataforma", detail: "US$ 800.000,00 c/u", qty: "1", amount: "US$ 800.000,00" },
  { description: "Horas extra", detail: "US$ 190.000,00 c/u", qty: "4", amount: "US$ 760.000,00" }
];

function LoginInvoice() {
  const tick = useInvoiceReveal();

  return (
    <article className="w-[320px] rounded-2xl bg-white px-6 py-7 shadow-float ring-1 ring-zinc-200/80">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="grid h-9 w-9 place-items-center rounded-md bg-zinc-900 text-[10px] font-semibold text-white">
            IH
          </div>
          <p className="mt-3 text-sm font-semibold tracking-tight">InvoiceHub</p>
        </div>
        <div className="text-right text-[11px] text-zinc-500">
          <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">Factura</p>
          <Fill show={tick >= 1} className="mt-1 font-medium text-zinc-900">
            INV-2026-18402
          </Fill>
          <Fill show={tick >= 1} className="mt-3">
            Emisión: 14 ago 2026
          </Fill>
          <Fill show={tick >= 1}>Vence: 13 sep 2026</Fill>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-4 text-xs">
        <Fill show={tick >= 2}>
          <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">De</p>
          <p className="mt-1 font-medium">InvoiceHub</p>
          <p className="text-zinc-500">analyst@invoicehub.local</p>
        </Fill>
        <Fill show={tick >= 2}>
          <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">Para</p>
          <p className="mt-1 font-medium">Initech</p>
          <p className="text-zinc-500">912345678</p>
        </Fill>
      </section>

      <table className="mt-6 w-full text-left text-[11px]">
        <thead>
          <tr className="border-b border-zinc-200 text-[10px] uppercase tracking-[0.12em] text-zinc-400">
            <th className="pb-2 font-medium">Concepto</th>
            <th className="pb-2 text-right font-medium">Cant.</th>
            <th className="pb-2 text-right font-medium">Importe</th>
          </tr>
        </thead>
        <tbody>
          {LINES.map((line, index) => (
            <tr key={line.description} className="border-b border-zinc-100">
              <td className="py-2.5 pr-2">
                <Fill show={tick >= 3 + index}>
                  <p className="font-medium text-zinc-900">{line.description}</p>
                  <p className="mt-0.5 text-[10px] text-zinc-400">{line.detail}</p>
                </Fill>
              </td>
              <td className="py-2.5 text-right text-zinc-500">
                <Fill show={tick >= 3 + index}>{line.qty}</Fill>
              </td>
              <td className="py-2.5 text-right tabular-nums">
                <Fill show={tick >= 3 + index}>{line.amount}</Fill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="ml-auto mt-5 w-52 space-y-1.5 text-[12px]">
        <div className="flex justify-between gap-3 text-zinc-500">
          <dt>Subtotal</dt>
          <dd className="whitespace-nowrap tabular-nums">
            <Fill show={tick >= 6}>US$ 3.960.000,00</Fill>
          </dd>
        </div>
        <div className="flex justify-between gap-3 text-zinc-500">
          <dt>Impuesto (19,00%)</dt>
          <dd className="whitespace-nowrap tabular-nums">
            <Fill show={tick >= 6}>US$ 752.400,00</Fill>
          </dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-zinc-200 pt-2 font-semibold">
          <dt>Total</dt>
          <dd className="whitespace-nowrap tabular-nums">
            <Fill show={tick >= 7}>US$ 4.712.400,00</Fill>
          </dd>
        </div>
      </dl>
    </article>
  );
}

function Fill({ show, className = "", children }: { show: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={`ih-login-fill ${show ? "is-in" : ""} ${className}`}>{children}</div>
  );
}

function useInvoiceReveal() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const steps = [600, 700, 550, 450, 450, 600, 500, 4200];

    async function run() {
      while (!cancelled) {
        setTick(0);
        for (let index = 1; index <= 7; index += 1) {
          await wait(steps[index - 1]);
          if (cancelled) {
            return;
          }
          setTick(index);
        }
        await wait(steps[7]);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return tick;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
