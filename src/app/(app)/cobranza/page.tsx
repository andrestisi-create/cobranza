import { auth } from "@/auth";
import { getNegociosCobranza } from "@/server/queries";
import { getTodasLasOpciones } from "@/server/opciones";
import { CobranzaTable } from "@/components/cobranza-table";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function CobranzaPage() {
  const session = await auth();
  const rol = session?.user?.rol;
  const puedeEliminar  = rol === "ADMIN" || rol === "SUPERVISOR";
  const puedeGestionar = rol === "ADMIN" || rol === "SUPERVISOR";

  const [negocios, opciones] = await Promise.all([
    getNegociosCobranza(),
    getTodasLasOpciones(),
  ]);

  return (
    <div className="p-6">
      <PageHeader
        title="Cobranza"
        description="Reporte interactivo de negocios. Usa el botón de cada fila para ver el detalle, registrar pagos y órdenes de compra."
      />
      <CobranzaTable
        negocios={negocios}
        puedeEliminar={puedeEliminar}
        puedeGestionar={puedeGestionar}
        opciones={opciones}
      />
    </div>
  );
}
