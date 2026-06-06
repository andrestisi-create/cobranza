// Tipos compartidos entre server actions y componentes cliente.

/** Resultado estándar de una server action usada con useActionState. */
export type ActionState = { ok?: boolean; error?: string } | undefined;
