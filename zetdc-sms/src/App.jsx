import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AlarmProvider, useAlarmContext } from './context/AlarmContext';
import Login from './pages/Login';
import Overview from './pages/Overview';
import SubstationDetail from './pages/SubstationDetail';

const SEVERITY_TOAST_STYLE = {
  critical: 'border-crit bg-crit/10 text-crit',
  warning: 'border-warn bg-warn/10 text-warn',
  info: 'border-info bg-info/10 text-info',
};

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function TopNav() {
  const { user, logout } = useAuth();
  return (
    <header className="border-b border-line bg-surface">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-mono text-sm font-semibold text-ink tracking-wide">
          SMS <span className="text-accent">●</span>
        </Link>
        <div className="flex items-center gap-4">
          {user && (
            <span className="text-xs font-mono text-muted">
              {user.email} <span className="text-faint">({user.role})</span>
            </span>
          )}
          <button onClick={logout} className="text-xs font-mono text-muted hover:text-ink transition-colors">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

function ToastStack() {
  const { toasts, dismissToast } = useAlarmContext();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map(({ id, alarm }) => (
        <div
          key={id}
          role="alert"
          className={`rounded border px-3 py-2 shadow-lg backdrop-blur bg-surface/95 ${
            SEVERITY_TOAST_STYLE[alarm.severity] || 'border-line'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-mono uppercase tracking-wide opacity-80">{alarm.severity} · {alarm.type}</p>
              <p className="text-sm text-ink mt-0.5">{alarm.message}</p>
            </div>
            <button onClick={() => dismissToast(id)} className="text-faint hover:text-ink shrink-0" aria-label="Dismiss">
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AuthedShell({ children }) {
  return (
    <>
      <TopNav />
      <ToastStack />
      {children}
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AuthedShell>
              <Overview />
            </AuthedShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sites/:id"
        element={
          <ProtectedRoute>
            <AuthedShell>
              <SubstationDetail />
            </AuthedShell>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AlarmProvider>
          <AppRoutes />
        </AlarmProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
