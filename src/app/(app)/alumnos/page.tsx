import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { AlumnosManager, type AlumnoRow } from "@/components/alumnos-manager";

export const dynamic = "force-dynamic";

export default async function AlumnosPage() {
  const session = await auth();
  const puedeGestionar = session?.user?.rol !== "COBRADOR";

  const alumnos = await prisma.alumno.findMany({
    orderBy: { apellidoPaterno: "asc" },
    include: { _count: { select: { negocios: true } } },
  });

  const rows: AlumnoRow[] = alumnos.map((a) => ({
    idAlumno: a.idAlumno,
    nombre: a.nombre,
    segundoNombre: a.segundoNombre,
    apellidoPaterno: a.apellidoPaterno,
    apellidoMaterno: a.apellidoMaterno,
    rut: a.rut,
    email: a.email,
    telefono: a.telefono,
    direccion: a.direccion,
    fechaNacimiento: a.fechaNacimiento ? a.fechaNacimiento.toISOString() : null,
    negociosCount: a._count.negocios,
  }));

  return (
    <div className="p-6">
      <PageHeader title="Alumnos" description="Gestión de alumnos." />
      <AlumnosManager alumnos={rows} puedeGestionar={puedeGestionar} />
    </div>
  );
}
