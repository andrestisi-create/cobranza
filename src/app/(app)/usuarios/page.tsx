import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { UsuariosManager, type UsuarioRow } from "@/components/usuarios-manager";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const session = await auth();
  if (session?.user?.rol !== "ADMIN") redirect("/");

  const usuarios = await prisma.usuario.findMany({ orderBy: { createdAt: "asc" } });

  const rows: UsuarioRow[] = usuarios.map((u) => ({
    id: u.id,
    email: u.email,
    nombre: u.nombre,
    rol: u.rol,
    activo: u.activo,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="p-6">
      <PageHeader title="Usuarios" description="Gestión de usuarios y roles (solo administradores)." />
      <UsuariosManager usuarios={rows} />
    </div>
  );
}
