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
    <body className={`${nunito.variable} font-sans min-h-dvh text-white antialiased bg-app`}>
    <LanguageProvider>
      <LanguageWrapper />

      {/* NAVBAR vertical fija a la izquierda */}
      <Navbar />

      {/* Contenido con margen izquierdo para la navbar */}
      <main className="lg:ml-64 p-3 sm:p-4 md:p-6 lg:p-8 relative z-10 pt-20 sm:pt-20 lg:pt-4">
        {children}
      </main>
    </LanguageProvider>
    </body>
    </html>
  );
}
