// app/auth/callback/page.tsx (Next 13+/App Router)
'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function OAuthCallback() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token); // o cookie si prefieres
    }
    router.replace('/'); // vuelve al dashboard
  }, [params, router]);

  return <p className="text-white p-6">Iniciando sesión…</p>;
}
