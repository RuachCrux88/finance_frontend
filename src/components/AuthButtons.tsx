// components/AuthButtons.tsx
export function GoogleLoginButton() {
  return (
    <button
      onClick={() => (window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`)}
      className="rounded-xl bg-fuchsia-600 px-4 py-2 text-white hover:bg-fuchsia-500 shadow"
    >
      Iniciar sesión con Google
    </button>
  );
}

export async function logout() {
  await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  window.location.reload();
}
