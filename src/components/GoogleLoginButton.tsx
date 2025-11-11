// src/components/GoogleLoginButton.tsx
"use client";

export default function GoogleLoginButton() {
  const onClick = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/google`;
  };

  return (
    <button
      onClick={onClick}
      className="btn-orange rounded-lg px-4 py-2 text-sm font-medium text-white"
    >
      Iniciar con Google
    </button>
  );
}
