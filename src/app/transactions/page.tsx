export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Transacciones</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card 1: Registrar */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-fuchsia-500/10 backdrop-blur-md">
          <h2 className="mb-1 text-xl font-medium">Registrar</h2>
          <p className="mb-4 text-sm text-slate-300">Agrega un gasto o ingreso</p>

          {/* Tus campos existentes, con clases bonitas (ver punto 3) */}
          {/* ... */}

          <button className="mt-4 inline-flex items-center rounded-xl bg-fuchsia-600 px-4 py-2 font-medium text-white hover:bg-fuchsia-500 active:scale-[.99] transition">
            Agregar transacción
          </button>
        </section>

        {/* Card 2: Actividad */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-indigo-500/10 backdrop-blur-md">
          <h2 className="mb-1 text-xl font-medium">Actividad</h2>
          <p className="mb-4 text-sm text-slate-300">Últimas transacciones</p>
          <div className="text-slate-300/90">No hay transacciones aún.</div>
        </section>
      </div>
    </div>
  );
}