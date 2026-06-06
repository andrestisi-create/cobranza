import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/sidebar";
import { cerrarSesion } from "@/server/auth-actions";
import { etiqueta } from "@/lib/format";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const esAdmin = session.user.rol === "ADMIN";

  return (
    <div className="flex min-h-screen">
      {/* Barra lateral */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
            C
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">Cobranza</div>
            <div className="text-xs text-slate-400">UA Blended</div>
          </div>
        </div>

        <Sidebar esAdmin={esAdmin} />

        <div className="mt-auto border-t border-slate-200 p-3">
          <div className="px-2 pb-2">
            <div className="truncate text-sm font-medium text-slate-800">
              {session.user.name}
            </div>
            <div className="text-xs text-slate-400">
              {etiqueta(session.user.rol)}
            </div>
          </div>
          <form action={cerrarSesion}>
            <button
              type="submit"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
