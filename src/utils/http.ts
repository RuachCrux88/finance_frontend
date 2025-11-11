// src/utils/http.ts
export async function apiFetch(path: string, init: RequestInit = {}) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
  const res = await fetch(`${base}${path}`, {
    ...init,
    credentials: 'include', // <<-- para enviar/recibir cookie JWT
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  // Si no hay cuerpo JSON, evita error
  const contentType = res.headers.get('content-type') || '';
  return contentType.includes('application/json') ? res.json() : null;
}
