"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export async function authenticate(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Email o contraseña incorrectos.";
    }
    // El redirect de éxito (NEXT_REDIRECT) debe propagarse.
    throw error;
  }
  return undefined;
}

export async function cerrarSesion() {
  await signOut({ redirectTo: "/login" });
}
