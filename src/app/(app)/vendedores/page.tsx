import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { VendedoresManager, type VendedorRow } from "@/components/vendedores-manager";

export const dynamic = "force-dynamic";

export default async function VendedoresPage() {
  const session = await auth();
  const puedeGestionar = session?.user?.rol !== "COBRADOR";

  const vendedores = await prisma.vendedor.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { negocios: true } } },
  });

  const rows: VendedorRow[] = vendedores.map((v) => ({
    id: v.id,
    nombre: v.nombre,
    email: v.email,
    telefono: v.telefono,
    activo: v.activo,
    negociosCount: v._count.negocios,
  }));

  return (
    <div className="p-6">
      <PageHeader
        title="Vendedores"
        description="Equipo de ventas. Los vendedores pueden ser asignados a los negocios."
      />
      <VendedoresManager vendedores={rows} puedeGestionar={puedeGestionar} />
    </div>
  );
}
