"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { fetchMe, doLogout } from "@/utils/session";
import type { User } from "@/types";

// Generar cadena aleatoria de letras (mayúsculas y minúsculas, sin tildes)
function generateRandomString(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteConfirmCode, setDeleteConfirmCode] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Generar código de confirmación cuando se monta el componente
  useEffect(() => {
    setDeleteConfirmCode(generateRandomString(8));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetchMe();
        setUser(me);
      } catch (e: any) {
        setError(e.message || "Error al cargar información del usuario");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleDeleteAccount() {
    setError("");
    
    if (!deleteConfirm) {
      setError("Debes marcar la casilla de confirmación");
      return;
    }

    if (deleteConfirmText.trim() !== deleteConfirmCode) {
      setError(`Debes escribir exactamente: ${deleteConfirmCode}`);
      return;
    }

    if (!confirm("¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer.")) {
      return;
    }

    setDeleting(true);
    setError("");
    try {
      await api("/users/me", {
        method: "DELETE",
      });
      await doLogout();
      router.push("/login");
    } catch (e: any) {
      setError(e.message || "Error al eliminar la cuenta");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="card-glass p-6 text-center">
        <p className="text-warm">Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="card-glass p-6 text-center">
        <p className="text-rose-600">{error || "No se pudo cargar la información del usuario"}</p>
      </div>
    );
  }

  return (
    <div>
        <div className="space-y-6">
          {/* Encabezado */}
          <div className="card-glass p-6">
            <h1 className="text-2xl font-semibold text-warm-dark mb-2">Configuración del Perfil</h1>
            <p className="text-warm text-sm">Gestiona tu información personal y cuenta</p>
          </div>

          {/* Información del usuario */}
          <div className="card-glass p-6">
            <h2 className="text-lg font-semibold text-warm-dark mb-4">Información Personal</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-warm-dark mb-1.5">Nombre</label>
                <div className="rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark cursor-default">
                  {user.name || "No especificado"}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-dark mb-1.5">Correo electrónico</label>
                <div className="rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark cursor-default">
                  {user.email}
                </div>
              </div>
              {user.createdAt && (
                <div>
                  <label className="block text-sm font-medium text-warm-dark mb-1.5">Fecha de registro</label>
                  <div className="rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark cursor-default">
                    {new Date(user.createdAt).toLocaleDateString('es-CO', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Zona de peligro - Eliminar cuenta */}
          <div className="card-glass p-6 border-2 border-rose-200">
            <h2 className="text-lg font-semibold text-rose-600 mb-2">Zona de Peligro</h2>
            <p className="text-warm text-sm mb-4">
              Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor, ten cuidado.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="deleteConfirm"
                  checked={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.checked)}
                  className="w-4 h-4 rounded border-[#E8E2DE] text-rose-600 focus:ring-rose-500"
                />
                <label htmlFor="deleteConfirm" className="text-sm text-warm-dark">
                  Entiendo que esta acción no se puede deshacer
                </label>
              </div>
              
              {deleteConfirm && (
                <div>
                  <label className="block text-sm font-medium text-warm-dark mb-1.5">
                    Escribe <span className="font-mono text-rose-600 font-bold">{deleteConfirmCode}</span> para confirmar
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={deleteConfirmCode}
                    className="w-full rounded-lg border border-[#E8E2DE] bg-[#FEFFFF]/50 px-3 py-2 text-sm text-warm-dark placeholder:text-warm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500/50"
                  />
                </div>
              )}

              {error && (
                <p className="text-xs text-rose-600 font-medium">{error}</p>
              )}

              <button
                onClick={handleDeleteAccount}
                disabled={!deleteConfirm || deleteConfirmText.trim() !== deleteConfirmCode || deleting}
                className="w-full rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {deleting ? "Eliminando..." : "Eliminar mi cuenta"}
              </button>
            </div>
          </div>
        </div>
    </div>
  );
}

