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
    <body className={`${inter.variable} ${sora.variable} font-sans min-h-dvh text-warm-dark antialiased bg-app`}>
    {/* Líneas verticales decorativas (inspiradas en la imagen) */}
    <div className="fixed top-0 left-[25%] w-px h-full bg-white/30 blur-[1px] -z-10" />
    <div className="fixed top-0 left-[27%] w-px h-full bg-white/30 blur-[1px] -z-10" />

    {/* NAVBAR fija */}
    <Navbar />

    {/* Contenido */}
    <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 relative z-10">
      {children}
    </main>
    </body>
    </html>
  );
}
