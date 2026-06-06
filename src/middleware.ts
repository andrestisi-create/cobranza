import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Protege todas las rutas excepto API de auth, estáticos e imágenes.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
