import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cobranza y Pre-Cobranza · UA Blended",
  description: "Sistema de cobranza y seguimiento de ventas Sence",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
