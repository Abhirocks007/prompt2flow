import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AgentPage } from "./pages/AgentPage";
import { OperatorDetail } from "./pages/OperatorDetail";
import { OperatorsList } from "./pages/OperatorsList";
import { WorkbenchPage } from "./pages/WorkbenchPage";

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<AgentPage />} />
        <Route path="/c/:id" element={<AgentPage />} />
        <Route path="/operators" element={<OperatorsList />} />
        <Route path="/operators/:id" element={<OperatorDetail />} />
        <Route path="/workbench" element={<WorkbenchPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
