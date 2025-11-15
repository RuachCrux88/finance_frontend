import "./globals.css";
import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import Navbar from "@/components/NavBar";
import { LanguageProvider } from "@/contexts/LanguageContext";
import LanguageWrapper from "@/components/LanguageWrapper";

export const metadata: Metadata = {
  title: "Finance",
  description: "Finanzas personales y grupales",
  icons: {
    icon: "/coin-f.svg",
    shortcut: "/coin-f.svg",
    apple: "/coin-f.svg",
  },
};

const nunito = Nunito({ 
  subsets: ["latin"], 
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-sans" 
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
    <body className={`${nunito.variable} font-sans min-h-dvh text-warm-dark antialiased bg-app`}>
    <LanguageProvider>
      <LanguageWrapper />
      {/* Líneas verticales decorativas que combinan con el fondo */}
      <div className="fixed top-0 left-[25%] w-px h-full bg-[#FFB6C1]/20 blur-[1px] -z-10" />
      <div className="fixed top-0 left-[27%] w-px h-full bg-[#DA70D6]/15 blur-[1px] -z-10" />

      {/* NAVBAR vertical fija a la izquierda */}
      <Navbar />

      {/* Contenido con margen izquierdo para la navbar */}
      <main className="ml-64 p-4 sm:p-6 lg:p-8 relative z-10">
        {children}
      </main>
    </LanguageProvider>
    </body>
    </html>
  );
}
