"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";

type NavItem = { href: string; label: string; soloAdmin?: boolean };

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard" },
  { href: "/negocios", label: "Negocios" },
  { href: "/pre-cobranza", label: "Pre-cobranza" },
  { href: "/cobranza", label: "Cobranza" },
  { href: "/alumnos", label: "Alumnos" },
  { href: "/programas", label: "Programas" },
  { href: "/vendedores", label: "Vendedores" },
  { href: "/usuarios", label: "Usuarios", soloAdmin: true },
  { href: "/configuracion", label: "Configuración", soloAdmin: true },
];

export function Sidebar({ esAdmin }: { esAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.filter((i) => !i.soloAdmin || esAdmin).map((item) => {
        const activo =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition",
              activo
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
