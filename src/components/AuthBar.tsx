"use client";
import { useEffect, useState } from "react";

export default function AuthBar() {
  const [token, setToken] = useState("");

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) setToken(t);
  }, []);

  function save() {
    localStorage.setItem("token", token.trim());
    alert("Token guardado en localStorage.");
  }
  function clear() {
    localStorage.removeItem("token");
    setToken("");
    alert("Token eliminado.");
  }

  return (
    <div className="p-3 border rounded bg-gray-50 flex gap-2 items-center">
      <span className="text-sm text-gray-600">JWT</span>
      <input
        className="flex-1 border rounded px-2 py-1 text-sm"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="pega aquí tu token (opcional)"
      />
      <button onClick={save} className="px-3 py-1 rounded bg-black text-white text-sm">Guardar</button>
      <button onClick={clear} className="px-3 py-1 rounded border text-sm">Limpiar</button>
    </div>
  );
}
