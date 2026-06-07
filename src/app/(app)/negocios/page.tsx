import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { NegociosManager, type NegocioRow } from "@/components/negocios-manager";

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

  const [negocios, alumnos, programas] = await Promise.all([
    prisma.negocio.findMany({
      orderBy: { fechaCreacion: "desc" },
      include: {
        alumno: true,
        ordenesCompra: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.alumno.findMany({ orderBy: { apellidoPaterno: "asc" } }),
    prisma.programa.findMany({ orderBy: { codPrograma: "asc" } }),
  ]);

  const rows: NegocioRow[] = negocios.map((n) => ({
    recordId: n.recordId,
    idAlumno: n.idAlumno,
    alumnoNombre: nombre(n.alumno),
    codPrograma: n.codPrograma,
    montoNegocio: toNumber(n.montoNegocio),
    tipoNegocio: n.tipoNegocio,
    tipoVenta: n.tipoVenta,
    tipoDocto: n.tipoDocto,
    estadoNegocio: n.estadoNegocio,
    fechaCreacion: n.fechaCreacion.toISOString(),
    ordenes: n.ordenesCompra.map((oc) => ({
      id: oc.id,
      tipoOC: oc.tipoOC,
      numeroOC: oc.numeroOC,
      entidadNombre: oc.entidadNombre,
      entidadRut: oc.entidadRut,
      monto: toNumber(oc.monto),
      estadoOC: oc.estadoOC,
    })),
  }));

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
        puedeGestionar={puedeGestionar}
      />
    </div>
  );
}
