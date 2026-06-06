import { auth } from "@/auth";
import { getNegociosCobranza } from "@/server/queries";
import { CobranzaTable } from "@/components/cobranza-table";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function PreCobranzaPage() {
  const session = await auth();
  const rol = session?.user?.rol;
  const puedeEliminar = rol === "ADMIN" || rol === "SUPERVISOR";

  const negocios = await getNegociosCobranza();
  const pendientes = negocios.filter((n) => n.esSence && !n.tieneDocumento);

  return (
    <div className="p-6">
      <PageHeader
        title="Pre-cobranza (Sence)"
        description="Ventas Sence que aún no tienen documento tributario. Revisa sus órdenes de compra (OTIC/Empresa) y registra el documento cuando se emita."
      />
      <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
        <span className="font-bold">{pendientes.length}</span>
        ventas Sence pendientes de documento tributario
      </div>
      <CobranzaTable negocios={negocios} puedeEliminar={puedeEliminar} soloPendientes />
    </div>
  );
}
