import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { NegociosManager, type NegocioRow } from "@/components/negocios-manager";
import { getTodasLasOpciones } from "@/server/opciones";

export const dynamic = "force-dynamic";

function nombre(a: {
  nombre: string;
  segundoNombre: string | null;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
}) {
  return [a.nombre, a.segundoNombre, a.apellidoPaterno, a.apellidoMaterno]
    .filter(Boolean)
    .join(" ");
}

export default async function NegociosPage() {
  const session = await auth();
  const puedeGestionar = session?.user?.rol !== "COBRADOR";

  const [negocios, alumnos, programas, vendedores, opciones, ocsPorNegocio] = await Promise.all([
    prisma.negocio.findMany({
      orderBy: { fechaCreacion: "desc" },
      include: { alumno: true, vendedor: true },
    }),
    prisma.alumno.findMany({ orderBy: { apellidoPaterno: "asc" } }),
    prisma.programa.findMany({ orderBy: { codPrograma: "asc" } }),
    prisma.vendedor.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    getTodasLasOpciones(),
    prisma.ordenCompra.groupBy({ by: ["recordId"], _sum: { monto: true }, _count: { _all: true } }),
  ]);

  const ocPorRecordId = new Map(
    ocsPorNegocio.map((o) => [o.recordId, { total: toNumber(o._sum.monto), count: o._count._all }]),
  );

  const rows: NegocioRow[] = negocios.map((n) => {
    const oc = ocPorRecordId.get(n.recordId);
    return {
      recordId: n.recordId,
      idAlumno: n.idAlumno,
      alumnoNombre: nombre(n.alumno),
      codPrograma: n.codPrograma,
      montoNegocio: toNumber(n.montoNegocio),
      moneda: n.moneda,
      tipoNegocio: n.tipoNegocio,
      tipoVenta: n.tipoVenta,
      tipoDocto: n.tipoDocto,
      estadoNegocio: n.estadoNegocio,
      fechaCreacion: n.fechaCreacion.toISOString(),
      totalOC: oc?.total ?? 0,
      ordenesCount: oc?.count ?? 0,
      idVendedor: n.idVendedor,
      vendedorNombre: n.vendedor?.nombre ?? null,
    };
  });

  return (
    <div className="p-6">
      <PageHeader
        title="Negocios"
        description="Tabla madre de negocios. Crea nuevos y administra su estado."
      />
      <NegociosManager
        negocios={rows}
        alumnos={alumnos.map((a) => ({
          idAlumno: a.idAlumno,
          nombre: nombre(a),
          rut: a.rut ?? "",
        }))}
        programas={programas.map((p) => ({
          codPrograma: p.codPrograma,
          descripcion: p.descripcion,
        }))}
        vendedores={vendedores.map((v) => ({ id: v.id, nombre: v.nombre }))}
        opciones={opciones}
        puedeGestionar={puedeGestionar}
      />
    </div>
  );
}
