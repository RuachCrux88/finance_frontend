"use client";

import { useEffect, useState } from "react";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import { fetchMe } from "@/utils/session";
import type { User } from "@/types";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const getGreeting = () => {
    if (!user) return null;
    
    const hour = new Date().getHours();
    let timeGreeting = "";
    if (hour >= 6 && hour < 12) {
      timeGreeting = "Buenos días";
    } else if (hour >= 12 && hour < 20) {
      timeGreeting = "Buenas tardes";
      } else {
      timeGreeting = "Buenas noches";
    }

    return `${timeGreeting}, ${user.name || user.email}!`;
  };

  const getWelcomeMessage = () => {
    if (!user) return null;
    return "¡Bienvenido de nuevo!";
  };

  if (loading) {
      return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-warm text-sm">Cargando...</p>
        </div>
      );
    }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 w-full">
      {user ? (
        <>
          {/* Saludo de bienvenida/regreso */}
          <div className="text-center space-y-4">
            <h1 className="font-display text-4xl sm:text-5xl font-semibold text-warm-dark">
              {getGreeting()}
            </h1>
            <p className="text-xl text-warm">
              {getWelcomeMessage()}
            </p>
      </div>

          {/* Información sobre funcionalidades */}
          <div className="w-full max-w-4xl mt-8">
            <h2 className="text-2xl font-semibold text-warm-dark mb-6 text-center">
              ¿Qué puedes hacer con Finance?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card-glass p-5">
                <div className="text-3xl mb-3">💰</div>
                <h3 className="font-semibold text-warm-dark mb-2">Gestiona tus billeteras</h3>
                <p className="text-sm text-warm">
                  Crea y administra múltiples billeteras en diferentes divisas para organizar tus finanzas.
                </p>
              </div>
              <div className="card-glass p-5">
                <div className="text-3xl mb-3">📊</div>
                <h3 className="font-semibold text-warm-dark mb-2">Dashboard completo</h3>
                <p className="text-sm text-warm">
                  Visualiza gráficos de ingresos y gastos, estadísticas mensuales y el estado de tus finanzas.
                </p>
              </div>
              <div className="card-glass p-5">
                <div className="text-3xl mb-3">📝</div>
                <h3 className="font-semibold text-warm-dark mb-2">Registra transacciones</h3>
                <p className="text-sm text-warm">
                  Lleva un control detallado de todos tus ingresos y gastos con categorías personalizadas.
                </p>
              </div>
              <div className="card-glass p-5">
                <div className="text-3xl mb-3">🎯</div>
                <h3 className="font-semibold text-warm-dark mb-2">Metas de ahorro</h3>
                <p className="text-sm text-warm">
                  Establece objetivos financieros y monitorea tu progreso hacia alcanzarlos.
                </p>
              </div>
      <div className="card-glass p-5">
                <div className="text-3xl mb-3">🔔</div>
                <h3 className="font-semibold text-warm-dark mb-2">Recordatorios de pago</h3>
                <p className="text-sm text-warm">
                  Nunca olvides un pago importante con recordatorios automáticos de tus obligaciones.
                </p>
                        </div>
              <div className="card-glass p-5">
                <div className="text-3xl mb-3">🌍</div>
                <h3 className="font-semibold text-warm-dark mb-2">Múltiples divisas</h3>
                <p className="text-sm text-warm">
                  Trabaja con diferentes monedas y convierte automáticamente entre ellas.
                </p>
                  </div>
                </div>
          </div>
        </>
      ) : (
        <>
          {/* Mensaje de bienvenida para usuarios no autenticados */}
          <div className="text-center space-y-4">
            <h1 className="font-display text-4xl sm:text-5xl font-semibold text-warm-dark mb-2">
              Bienvenido a Finance
            </h1>
            <p className="text-lg text-warm mb-2">
              Tu plataforma completa para gestionar tus finanzas personales
            </p>
            <p className="text-sm text-warm mb-6">
              Inicia sesión para comenzar a tomar el control de tu dinero
            </p>
      </div>

          {/* Formulario de login */}
          <div className="card-glass p-8 w-full max-w-md">
            <h2 className="text-2xl font-semibold text-warm-dark mb-4 text-center">
              Iniciar sesión
            </h2>
            <p className="text-warm mb-6 text-center">
              Usa tu cuenta de Google para ingresar.
            </p>
            <div className="flex justify-center">
              <GoogleLoginButton />
            </div>
          </div>

          {/* Información sobre funcionalidades */}
          <div className="w-full max-w-5xl mt-12">
            <h2 className="text-3xl font-semibold text-warm-dark mb-8 text-center">
              ¿Qué puedes hacer con Finance?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="card-glass p-6">
                <div className="text-4xl mb-4 text-center">💰</div>
                <h3 className="font-semibold text-warm-dark mb-3 text-center">Gestiona tus billeteras</h3>
                <p className="text-sm text-warm text-center">
                  Crea y administra múltiples billeteras en diferentes divisas. Organiza tus finanzas de manera eficiente y mantén un control total sobre tus cuentas.
                </p>
              </div>
              <div className="card-glass p-6">
                <div className="text-4xl mb-4 text-center">📊</div>
                <h3 className="font-semibold text-warm-dark mb-3 text-center">Dashboard completo</h3>
                <p className="text-sm text-warm text-center">
                  Visualiza gráficos interactivos de tus ingresos y gastos, estadísticas mensuales detalladas y un resumen completo del estado de tus finanzas.
                </p>
              </div>
              <div className="card-glass p-6">
                <div className="text-4xl mb-4 text-center">📝</div>
                <h3 className="font-semibold text-warm-dark mb-3 text-center">Registra transacciones</h3>
                <p className="text-sm text-warm text-center">
                  Lleva un control detallado de todos tus ingresos y gastos. Categoriza cada transacción para un mejor análisis financiero.
                </p>
              </div>
              <div className="card-glass p-6">
                <div className="text-4xl mb-4 text-center">🎯</div>
                <h3 className="font-semibold text-warm-dark mb-3 text-center">Metas de ahorro</h3>
                <p className="text-sm text-warm text-center">
                  Establece objetivos financieros mensuales y anuales. Monitorea tu progreso en tiempo real y alcanza tus metas de ahorro.
                </p>
              </div>
              <div className="card-glass p-6">
                <div className="text-4xl mb-4 text-center">🔔</div>
                <h3 className="font-semibold text-warm-dark mb-3 text-center">Recordatorios de pago</h3>
                <p className="text-sm text-warm text-center">
                  Nunca olvides un pago importante. Configura recordatorios automáticos para tus facturas y obligaciones recurrentes.
                </p>
              </div>
              <div className="card-glass p-6">
                <div className="text-4xl mb-4 text-center">🌍</div>
                <h3 className="font-semibold text-warm-dark mb-3 text-center">Múltiples divisas</h3>
                <p className="text-sm text-warm text-center">
                  Trabaja con diferentes monedas simultáneamente. La aplicación convierte automáticamente entre divisas para facilitar tu gestión.
                </p>
              </div>
            </div>
            
            {/* Sección adicional de beneficios */}
            <div className="mt-12 card-glass p-8">
              <h3 className="text-2xl font-semibold text-warm-dark mb-4 text-center">
                Características principales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-warm">
                <div className="flex items-start gap-3">
                  <span className="text-warm-dark font-semibold">✓</span>
                  <span>Interfaz intuitiva y fácil de usar</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-warm-dark font-semibold">✓</span>
                  <span>Análisis visual con gráficos y estadísticas</span>
          </div>
                <div className="flex items-start gap-3">
                  <span className="text-warm-dark font-semibold">✓</span>
                  <span>Seguridad con autenticación de Google</span>
        </div>
                <div className="flex items-start gap-3">
                  <span className="text-warm-dark font-semibold">✓</span>
                  <span>Acceso desde cualquier dispositivo</span>
              </div>
                <div className="flex items-start gap-3">
                  <span className="text-warm-dark font-semibold">✓</span>
                  <span>Historial completo de transacciones</span>
              </div>
                <div className="flex items-start gap-3">
                  <span className="text-warm-dark font-semibold">✓</span>
                  <span>Gestión de categorías personalizadas</span>
              </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
