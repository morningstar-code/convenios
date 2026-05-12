import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ConventionForm } from "@/features/convenios/components/convention-form";

export default async function NuevoConvenioPage() {
  const session = await getSession();

  if (session?.role !== "admin") {
    redirect("/convenios");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Nuevo memorando o acuerdo</h1>
        <p className="text-sm text-slate-500 mt-1">
          Complete los campos para registrar un nuevo instrumento internacional
        </p>
      </div>
      <ConventionForm mode="create" />
    </div>
  );
}
