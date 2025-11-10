export async function api<T>(
  path: string,
  init?: RequestInit & { auth?: boolean }
): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL!;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (init?.auth && token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}
