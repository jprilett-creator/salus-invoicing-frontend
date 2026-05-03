import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./lib/auth";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { CounterpartiesPage } from "./pages/CounterpartiesPage";
import { NewCounterpartyPage } from "./pages/NewCounterpartyPage";
import { CounterpartyDetailPage } from "./pages/CounterpartyDetailPage";
import { RunInvoicingPage } from "./pages/RunInvoicingPage";
import { SubscriptionsPage } from "./pages/SubscriptionsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/counterparties" replace />} />
        <Route path="/counterparties" element={<CounterpartiesPage />} />
        <Route path="/counterparties/new" element={<NewCounterpartyPage />} />
        <Route
          path="/counterparties/:id"
          element={<CounterpartyDetailPage />}
        />
        <Route path="/subscriptions" element={<SubscriptionsPage />} />
        <Route path="/run-invoicing" element={<RunInvoicingPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
