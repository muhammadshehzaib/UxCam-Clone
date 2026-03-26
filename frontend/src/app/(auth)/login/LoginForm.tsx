'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { authLogin, authRegister } from '@/lib/api';
import { setToken } from '@/lib/auth';

type Mode = 'login' | 'register';

export default function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [mode,        setMode]        = useState<Mode>('login');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [name,        setName]        = useState('');
  const [projectName, setProjectName] = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  function validate(): string | null {
    if (!email.trim())                   return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address';
    if (password.length < 8)             return 'Password must be at least 8 characters';
    if (mode === 'register' && !projectName.trim()) return 'Project name is required';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      const result = mode === 'login'
        ? await authLogin(email, password)
        : await authRegister(email, password, projectName, name || undefined);

      setToken(result.token);

      const from = searchParams.get('from') ?? '/dashboard';
      router.push(from);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-white text-lg font-bold mx-auto mb-3">
          U
        </div>
        <h1 className="text-2xl font-bold text-slate-900">UXClone</h1>
        <p className="text-slate-500 text-sm mt-1">
          {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">

        {/* Name — register only */}
        {mode === 'register' && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Your name <span className="text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              data-testid="name-input"
            />
          </div>
        )}

        {/* Email */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            data-testid="email-input"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full px-3 py-2 pr-10 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              data-testid="password-input"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={showPass ? 'Hide password' : 'Show password'}
              data-testid="toggle-password"
            >
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Project name — register only */}
        {mode === 'register' && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Project name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="My App"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              data-testid="project-name-input"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg" data-testid="form-error">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          data-testid="submit-button"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <LogIn size={15} />
          )}
          {loading ? 'Please wait…' : (mode === 'login' ? 'Sign In' : 'Create Account')}
        </button>

        {/* Mode toggle */}
        <p className="text-center text-xs text-slate-500">
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); setError(null); }}
                className="text-brand-600 hover:underline font-medium"
                data-testid="switch-to-register"
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className="text-brand-600 hover:underline font-medium"
                data-testid="switch-to-login"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
