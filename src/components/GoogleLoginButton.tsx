// src/components/GoogleLoginButton.tsx
"use client";

export default function GoogleLoginButton() {
  const onClick = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/google`;
  };

  return (
    <button
      onClick={onClick}
      className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-fuchsia-500/20 hover:opacity-90 transition"
    >
      Iniciar con Google
    </button>
  );
}
