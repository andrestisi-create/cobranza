import type { DefaultSession } from "next-auth";
import type { RolUsuario } from "@prisma/client";

declare module "next-auth" {
  interface User {
    rol?: RolUsuario;
    nombre?: string;
  }

  interface Session {
    user: {
      id: string;
      rol?: RolUsuario;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    rol?: RolUsuario;
    nombre?: string;
  }
}
