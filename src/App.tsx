import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import DataManagement from './pages/DataManagement';
import Dashboard from './pages/Dashboard';
import Diagnose from './pages/Diagnose';
import DiagnoseRun from './pages/DiagnoseRun';
import Library from './pages/Library';
import NewSession from './pages/NewSession';
import Planned from './pages/Planned';
import ProcedureRunner from './pages/ProcedureRunner';
import Procedures from './pages/Procedures';
import Report from './pages/Report';
import Reports from './pages/Reports';
import SessionDetail from './pages/SessionDetail';
import Sessions from './pages/Sessions';
import SettingsPage from './pages/SettingsPage';
import SoftwareDetail from './pages/SoftwareDetail';
import WindowsSettings from './pages/WindowsSettings';

// The performance page is the only one that uses Recharts, so it loads on demand.
const PerformanceAnalysis = lazy(() => import('./pages/PerformanceAnalysis'));

// HashRouter keeps every route working on GitHub Pages, which serves only the root path.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="sessions/new" element={<NewSession />} />
          <Route path="sessions/:sessionId" element={<SessionDetail />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:customerId" element={<CustomerDetail />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/:sessionId" element={<Report />} />
          <Route path="diagnose" element={<Diagnose />} />
          <Route path="diagnose/:problemId" element={<DiagnoseRun />} />
          <Route path="library" element={<Library />} />
          <Route path="library/:toolId" element={<SoftwareDetail />} />
          <Route path="procedures" element={<Procedures />} />
          <Route path="procedures/:procedureId" element={<ProcedureRunner />} />
          <Route
            path="performance"
            element={
              <Suspense fallback={<p className="text-sm text-muted">Loading analysis…</p>}>
                <PerformanceAnalysis />
              </Suspense>
            }
          />
          <Route path="windows-settings" element={<WindowsSettings />} />
          <Route path="resources/knowledge" element={<Planned id="knowledge" />} />
          <Route path="resources/checklists" element={<Planned id="checklists" />} />
          <Route path="resources/notes" element={<Planned id="notes" />} />
          <Route path="resources/training" element={<Planned id="training" />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="data" element={<DataManagement />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
