"use client";

import Link from "next/link";
import GoogleLoginButton from "@/components/GoogleLoginButton";

export default function AuthRequired() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <div className="text-center space-y-4">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-semibold text-warm-dark">
          Acceso requerido
        </h2>
        <p className="text-lg text-warm max-w-md">
          Ingresa a la plataforma para comenzar a interactuar
        </p>
      </div>
      
      <div className="card-glass p-8 w-full max-w-md">
        <h3 className="text-xl font-semibold text-warm-dark mb-4 text-center">
          Iniciar sesión
        </h3>
        <p className="text-warm mb-6 text-center text-sm">
          Usa tu cuenta de Google para acceder a todas las funcionalidades
        </p>
        <div className="flex justify-center">
          <GoogleLoginButton />
        </div>
        <div className="mt-6 text-center">
          <Link 
            href="/" 
            className="text-sm text-warm hover:text-warm-dark underline"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

