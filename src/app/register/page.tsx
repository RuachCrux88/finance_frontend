'use client';

import { useState } from 'react';

export default function RegisterPage() {
  const api = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch(`${api}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMsg(data.message ?? 'No fue posible registrar.');
      } else {
        setMsg('¡Listo! Revisa tu correo y verifica tu cuenta para poder ingresar.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto mt-10 max-w-md space-y-6 rounded-2xl border border-white/10 bg-white/10 p-6 backdrop-blur-md">
      <h1 className="text-2xl font-semibold">Crear cuenta</h1>
      {msg && <p className="rounded-lg bg-white/10 p-3 text-sm">{msg}</p>}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-white/80">Nombre (opcional)</label>
          <input className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2"
                 value={name} onChange={e=>setName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-white/80">Correo</label>
          <input className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2"
                 type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-sm text-white/80">Contraseña</label>
          <input className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2"
                 type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        </div>
        <button disabled={loading} className="w-full rounded-xl bg-fuchsia-600 px-4 py-2 font-medium text-white hover:bg-fuchsia-500 disabled:opacity-60">
          {loading ? 'Registrando...' : 'Registrarme'}
        </button>
      </form>
      <p className="text-center text-sm text-white/70">
        ¿Ya tienes cuenta? <a href="/login" className="text-fuchsia-300 hover:text-fuchsia-200">Inicia sesión</a>
      </p>
    </section>
  );
}
