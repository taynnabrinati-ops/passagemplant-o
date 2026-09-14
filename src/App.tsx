import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Dashboard } from "@/routes/Dashboard";
import { BedDetail } from "@/routes/BedDetail";
import { Placeholder } from "@/routes/Placeholder";

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard?unit=cti-1" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/leito/:bedNumber" element={<BedDetail />} />
        <Route path="/round" element={<Placeholder title="Round" />} />
        <Route path="/passagem" element={<Placeholder title="Passagem de plantão" />} />
        <Route path="/arquivo" element={<Placeholder title="Arquivo" />} />
        <Route path="/admin" element={<Placeholder title="Admin" />} />
        <Route path="*" element={<Navigate to="/dashboard?unit=cti-1" replace />} />
      </Route>
    </Routes>
  );
}
