import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const ok = await login(email, password);
    setSubmitting(false);
    if (ok) navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Substation Monitoring System</p>
          <h1 className="text-2xl font-semibold text-ink mt-2">Sign in</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface border border-line rounded-lg p-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-mono text-muted mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-raised border border-line rounded px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-accent"
              placeholder="admin@sms.local"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-mono text-muted mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-raised border border-line rounded px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-accent"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-crit">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-accent text-bg font-mono text-sm font-semibold rounded py-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
