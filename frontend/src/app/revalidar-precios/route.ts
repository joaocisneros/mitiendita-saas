import { revalidatePath, revalidateTag } from "next/cache";

/**
 * El superadmin llama aquí al guardar un plan o la configuración: la página de
 * precios deja de usar la copia guardada y muestra el cambio al instante.
 * Solo refresca datos públicos, así que no necesita sesión.
 */
export async function POST() {
  revalidateTag("precios", { expire: 0 });
  revalidatePath("/");
  return Response.json({ ok: true });
}
