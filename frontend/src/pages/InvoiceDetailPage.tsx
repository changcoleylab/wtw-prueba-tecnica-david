import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { InvoicePreview, PrintSoonButton } from "../components/InvoicePreview";
import { PageTrail } from "../components/PageTrail";
import { StatusPicker } from "../components/StatusPicker";
import { ApiError, getInvoice, updateInvoiceStatus } from "../lib/api";

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["invoices", id],
    queryFn: () => getInvoice(id!),
    enabled: Boolean(id)
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateInvoiceStatus(id!, status),
    onSuccess: async (updated) => {
      queryClient.setQueryData(["invoices", id], updated);
      await queryClient.invalidateQueries({ queryKey: ["invoices"] });
    }
  });

  if (query.isPending) {
    return <p className="text-zinc-500">Cargando factura…</p>;
  }

  if (query.error) {
    const error = query.error as ApiError;
    return (
      <div>
        <PageTrail items={[{ label: "Facturas", to: "/" }, { label: "No encontrada" }]} />
        <p className="mt-4 text-rose-600">
          {error.status === 404 ? "Factura no encontrada." : error.detail ?? error.title}
        </p>
      </div>
    );
  }

  const invoice = query.data;
  if (!invoice) {
    return null;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageTrail items={[{ label: "Facturas", to: "/" }, { label: invoice.invoiceNumber }]} />
        <StatusPicker
          value={invoice.status}
          disabled={statusMutation.isPending}
          onChange={(status) => statusMutation.mutate(status)}
        />
      </div>
      {statusMutation.error ? (
        <p className="mt-3 text-sm text-rose-600">
          {(statusMutation.error as ApiError).detail ?? "No se pudo actualizar el estado."}
        </p>
      ) : null}
      <div className="relative mt-5 min-h-0 flex-1">
        <div className="ih-scroll h-full overflow-y-auto rounded-[24px] bg-zinc-100 p-5 md:p-10">
          <InvoicePreview
            data={{
              invoiceNumber: invoice.invoiceNumber,
              clientName: invoice.clientName,
              clientDocument: invoice.clientDocument,
              clientEmail: invoice.clientEmail ?? undefined,
              issueDate: invoice.issueDate,
              dueDate: invoice.dueDate,
              currency: invoice.currency,
              subtotal: invoice.subtotal,
              tax: invoice.tax,
              total: invoice.total,
              status: invoice.status,
              lines: invoice.lines
            }}
          />
        </div>
        <PrintSoonButton className="absolute bottom-6 right-6 z-20" />
      </div>
    </div>
  );
}
