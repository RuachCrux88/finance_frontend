'use client';

type Props = { className?: string };

export default function GoogleSignInButton({ className }: Props) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

  const handleClick = () => {
    // Redirige al backend (Nest) que inicia OAuth con Google.
    // Si tu backend ya conoce FRONTEND_URL, no necesitas el parámetro redirect.
    const redirect = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${apiBase}/auth/google?redirect=${encodeURIComponent(redirect)}`;
    window.location.href = url;
  };

  return (
    <button
      onClick={handleClick}
      className={`btn-primary flex items-center gap-2 ${className ?? ''}`}
    >
      {/* Ícono de Google */}
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="#EA4335"
          d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.7-2.5-5.7-5.7s2.5-5.7 5.7-5.7c1.8 0 3 .8 3.7 1.4l2.5-2.5C16.8 3.4 14.6 2.5 12 2.5 7.3 2.5 3.5 6.3 3.5 11S7.3 19.5 12 19.5c6.5 0 8.7-4.6 8.7-7 0-.5 0-1-.1-1.3H12z"
        />
      </svg>
      Iniciar con Google
    </button>
  );
}
