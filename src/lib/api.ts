export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export class AuthError extends Error {
  constructor(message: string = 'No autenticado') {
    super(message);
    this.name = 'AuthError';
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
    
    if (!res.ok) {
      // Si es un error 401 (No autorizado), lanzar AuthError
      if (res.status === 401) {
        throw new AuthError('No autenticado');
      }
      
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText} -> ${text}`);
    }
    return res.json() as Promise<T>;
  } catch (error: any) {
    // Si es un error de red (Failed to fetch), verificar si es por autenticación
    if (error instanceof TypeError && error.message.includes('fetch')) {
      // Intentar verificar si el usuario está autenticado
      throw new AuthError('No autenticado');
    }
    // Re-lanzar otros errores
    throw error;
  }
}
