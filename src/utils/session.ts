export type Me = { id: string; email: string; name?: string } | null;

export async function fetchMe(): Promise<Me> {
  const api = process.env.NEXT_PUBLIC_API_BASE_URL!;
  try {
    const res = await fetch(`${api}/users/me`, {
      credentials: 'include', // importante para que viaje la cookie HttpOnly
    });
    if (!res.ok) return null;
    return (await res.json()) as Me;
  } catch {
    return null;
  }
}

export async function logout() {
  const api = process.env.NEXT_PUBLIC_API_BASE_URL!;
  await fetch(`${api}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}
