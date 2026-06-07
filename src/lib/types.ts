// Tipos compartidos entre server actions y componentes cliente.

/** Resultado de una importación masiva CSV. */
export interface ResultadoImport {
  creados: number;
  errores: { fila: number; mensaje: string }[];
}

/** Resultado estándar de una server action usada con useActionState. */
export type ActionState =
  | { ok?: boolean; error?: string; resultado?: ResultadoImport }
  | undefined;
