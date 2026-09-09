'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@hapcargo/ui';
import { NAMESPACES } from '@/i18n';

export default function LoginPage() {
  const { t, i18n } = useTranslation(NAMESPACES);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [locale, setLocale] = React.useState(i18n.language || 'en');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Login failed');
      }
      window.location.href = '/dashboard';
    } catch (err: unknown) {
       setError(err instanceof Error ? err.message : t('errors:generic'));
    } finally {
      setLoading(false);
    }
  };

  const changeLocale = (l: string) => {
    setLocale(l);
    i18n.changeLanguage(l);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary/30 p-4">
      <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
          <CardTitle className="text-xl">{t('common:appName')}</CardTitle>
          <CardDescription>{t('auth:login')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth:email')}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth:password')}</Label>
              <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
              <Button type="button" variant="ghost" size="sm" className="p-0 h-auto text-xs" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? t('auth:hidePassword') : t('auth:showPassword')}
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? t('auth:loggingIn') : t('auth:signIn')}
            </Button>
          </form>
          <div className="flex items-center justify-between text-xs">
            <button type="button" className="text-primary underline" onClick={() => alert('Forgot password flow')}>
              {t('auth:forgotPassword')}
            </button>
            <select value={locale} onChange={(e) => changeLocale(e.target.value)} className="border rounded px-2 py-1 bg-background">
              <option value="ro">RO</option>
              <option value="en">EN</option>
              <option value="nl">NL</option>
              <option value="pl">PL</option>
              <option value="fr">FR</option>
              <option value="es">ES</option>
            </select>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
