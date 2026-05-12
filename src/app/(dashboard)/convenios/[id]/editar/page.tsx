import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { findConventionById } from "@/repositories/convention.repository";
import { ConventionForm } from "@/features/convenios/components/convention-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarConvenioPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();

  if (session?.role !== "admin") redirect(`/convenios/${id}`);

  const convention = await findConventionById(id);
  if (!convention) notFound();

  const defaultValues = {
    id: convention.id,
    codigoInterno: convention.codigoInterno ?? undefined,
    tipoInstrumento: convention.tipoInstrumento,
    contraparte: convention.contraparte,
    pais: convention.pais,
    fechaFirma: convention.fechaFirma
      ? convention.fechaFirma.toISOString().split("T")[0]
      : undefined,
    duracionTexto: convention.duracionTexto ?? undefined,
    duracionMeses: convention.duracionMeses ?? undefined,
    renovacionAutomatica: convention.renovacionAutomatica,
    estatus: convention.estatus,
    condicionTerminacion: convention.condicionTerminacion ?? undefined,
    diasPreaviso: convention.diasPreaviso ?? undefined,
    puntoFocal: convention.puntoFocal,
    cargoPuntoFocal: convention.cargoPuntoFocal ?? undefined,
    correoPuntoFocal: convention.correoPuntoFocal ?? undefined,
    direccionesInvolucradas: convention.direccionesInvolucradas,
    objetivo: convention.objetivo,
    modalidadesCooperacion: convention.modalidadesCooperacion,
    areasCooperacion: convention.areasCooperacion,
    impactoEsperado: convention.impactoEsperado ?? undefined,
    responsabilidadFinanciera: convention.responsabilidadFinanciera,
    montoReferencial: convention.montoReferencial
      ? Number(convention.montoReferencial)
      : undefined,
    observaciones: convention.observaciones ?? undefined,
    conclusionInterna: convention.conclusionInterna ?? undefined,
    recomendacionPreliminar: convention.recomendacionPreliminar ?? undefined,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Editar memorando o acuerdo</h1>
        <p className="text-sm text-slate-500 mt-1">{convention.contraparte} · {convention.pais}</p>
      </div>
      <ConventionForm mode="edit" defaultValues={defaultValues} />
    </div>
  );
}
