import "./globals.css";
import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import Navbar from "@/components/NavBar"; // lo creamos en el paso 2

export const metadata: Metadata = {
  title: "Finance",
  description: "Finanzas personales y grupales",
};

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const sora  = Sora({ subsets: ["latin"], variable: "--font-display" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
    <body className={`${inter.variable} ${sora.variable} font-sans min-h-dvh text-slate-100 antialiased`}>
    {/* Fondo con gradientes */}
    <div className="fixed inset-0 -z-10 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#312e81]" />
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(124,58,237,.35),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(40%_35%_at_80%_80%,rgba(236,72,153,.25),transparent)]" />
    </div>

    {/* NAVBAR fija */}
    <Navbar />

    {/* Contenido */}
    <main className="mx-auto max-w-6xl p-6">
      {children}
    </main>
    </body>
    </html>
  );
}
