import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./lib/auth";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { CounterpartiesPage } from "./pages/CounterpartiesPage";
import { NewCounterpartyPage } from "./pages/NewCounterpartyPage";
import { CounterpartyDetailPlaceholder } from "./pages/CounterpartyDetailPlaceholder";
import { RunInvoicingPage } from "./pages/RunInvoicingPage";

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
          element={<CounterpartyDetailPlaceholder />}
        />
        <Route path="/run-invoicing" element={<RunInvoicingPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
