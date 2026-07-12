import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCatalogosCompletos } from "@/server/opciones";
import { PageHeader } from "@/components/page-header";
import { ConfiguracionManager } from "@/components/configuracion-manager";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const session = await auth();
  if (session?.user?.rol !== "ADMIN") redirect("/");

  const catalogos = await getCatalogosCompletos();

  return (
    <div className="p-6">
      <PageHeader
        title="Configuración"
        description="Datos maestros del sistema: agrega o quita los valores disponibles para Estado, Tipo de Negocio, Tipo de Venta y Tipo de Documento (solo administradores)."
      />
      <ConfiguracionManager catalogos={catalogos} />
    </div>
  );
}
