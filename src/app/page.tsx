import { redirect } from "next/navigation";

export default function HomePage() {
  // El inventario de instrumentos es la pantalla de entrada: sirve a admins y
  // a viewers por igual, y lleva los indicadores que antes vivían en Dashboard.
  redirect("/convenios");
}
