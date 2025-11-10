import { PropsWithChildren, ReactNode } from "react";

export default function GlassCard({
                                    title, subtitle, action, children
                                  }: PropsWithChildren<{ title: string; subtitle?: string; action?: ReactNode }>) {
  return (
    <section className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {subtitle && <p className="text-white/60 text-sm">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
