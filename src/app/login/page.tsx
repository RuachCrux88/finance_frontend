// src/app/login/page.tsx
"use client";

import GoogleLoginButton from "@/components/GoogleLoginButton";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <section className="rounded-2xl border border-white/10 bg-white/10 p-6 shadow-lg shadow-fuchsia-500/10">
        <h1 className="text-3xl font-semibold mb-4">Iniciar sesión</h1>
        <p className="text-slate-300 mb-6">
          Usa tu cuenta de Google para ingresar.
        </p>
        <GoogleLoginButton />
      </section>
    </main>
  );
}
