import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <AppShell
      esAdmin={session.user.rol === "ADMIN"}
      userName={session.user.name ?? ""}
      userRol={session.user.rol ?? ""}
    >
      {children}
    </AppShell>
  );
}
