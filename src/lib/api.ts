export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    // Para depurar mejor que "Failed to fetch"
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText} -> ${text}`);
  }
  return res.json() as Promise<T>;
}
