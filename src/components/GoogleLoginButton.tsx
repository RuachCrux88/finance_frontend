// src/components/GoogleLoginButton.tsx
"use client";

import { useState } from "react";

export default function GoogleLoginButton() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
      
      // Verificar que el backend esté disponible antes de redirigir
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // Timeout de 3 segundos
        
        const response = await fetch(`${apiBase}/health`, {
          method: 'GET',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error('Backend no disponible');
        }
      } catch (healthError: any) {
        // Si hay un error de conexión, mostrar mensaje claro
        if (healthError.name === 'AbortError' || healthError.message?.includes('Failed to fetch') || healthError.message?.includes('ERR_CONNECTION_REFUSED')) {
          setError(`No se pudo conectar con el servidor en ${apiBase}`);
          setLoading(false);
          return;
        }
        // Si es otro tipo de error, continuar con la redirección
        console.warn('No se pudo verificar el estado del backend, procediendo...', healthError);
      }
      
      // Redirigir al endpoint de autenticación de Google
      const authUrl = `${apiBase}/auth/google`;
      window.location.href = authUrl;
    } catch (err: any) {
      console.error('Error al iniciar sesión:', err);
      setError(
        err.message?.includes('timeout') || err.message?.includes('Failed to fetch') || err.message?.includes('ERR_CONNECTION_REFUSED')
          ? `No se pudo conectar con el servidor. Verifica que el backend esté corriendo en ${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}`
          : 'Error al iniciar sesión. Por favor, intenta nuevamente.'
      );
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={onClick}
        disabled={loading}
        className={`btn-orange rounded-lg px-4 py-2 text-sm font-medium text-white ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {loading ? "Conectando..." : "Iniciar con Google"}
      </button>
      {error && (
        <div className="text-xs text-blue-300 bg-white/10 border border-white/20 rounded-lg p-3 max-w-md backdrop-blur-sm">
          <p className="font-medium mb-2 text-white">Error de conexión</p>
          <p className="mb-2 text-white/80">{error}</p>
          <div className="space-y-2 text-white/70 text-xs">
            <p className="font-medium text-white">Para solucionarlo:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Asegúrate de que el backend esté corriendo</li>
              <li>Si estás en desarrollo, ejecuta en una terminal:</li>
            </ol>
            <code className="block mt-2 text-xs bg-white/10 px-3 py-2 rounded font-mono text-white/90">
              cd finance-backend<br />
              npm run start:dev
            </code>
            <p className="mt-2 text-xs">
              El backend debería estar corriendo en: <strong>{process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
