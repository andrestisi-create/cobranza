import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { ProgramasManager, type ProgramaRow } from "@/components/programas-manager";

export const dynamic = "force-dynamic";

export default async function ProgramasPage() {
  const session = await auth();
  const puedeGestionar = session?.user?.rol !== "COBRADOR";

  const programas = await prisma.programa.findMany({
    orderBy: { codPrograma: "asc" },
    include: { _count: { select: { negocios: true } } },
  });

  const rows: ProgramaRow[] = programas.map((p) => ({
    codPrograma: p.codPrograma,
    descripcion: p.descripcion,
    fechaInicio: p.fechaInicio.toISOString(),
    fechaFin: p.fechaFin.toISOString(),
    valor: p.valor !== null ? toNumber(p.valor) : null,
    negociosCount: p._count.negocios,
  }));

  return (
    <div className="p-6">
      <PageHeader title="Programas" description="Catálogo de programas/cursos." />
      <ProgramasManager programas={rows} puedeGestionar={puedeGestionar} />
    </div>
  );
}
