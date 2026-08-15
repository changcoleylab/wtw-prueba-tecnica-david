import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell, RequireAuth } from "./components/Layout";
import { InvoicesStage } from "./components/InvoicesStage";
import { InvoiceDetailPage } from "./pages/InvoiceDetailPage";
import { LoginPage } from "./pages/LoginPage";
import { NewInvoicePage } from "./pages/NewInvoicePage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route element={<InvoicesStage />}>
            <Route index element={null} />
            <Route path="invoices/new" element={<NewInvoicePage />} />
            <Route path="invoices/:id" element={<InvoiceDetailPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
