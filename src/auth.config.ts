import type { NextAuthConfig } from "next-auth";
import type { RolUsuario } from "@prisma/client";

// Configuración apta para el middleware (Edge): sin acceso a base de datos.
// El provider de credenciales (que usa Prisma) se añade en src/auth.ts.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");

      if (isOnLogin) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.rol = user.rol;
        token.nombre = user.nombre;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.rol = token.rol as RolUsuario | undefined;
        const nombre = token.nombre as string | undefined;
        if (nombre) session.user.name = nombre;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
