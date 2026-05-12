"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ConventionCreateSchema, type ConventionCreateInput } from "@/validators/convention.validator";
import { toast } from "@/hooks/use-toast";

interface ConventionFormProps {
  defaultValues?: Partial<ConventionCreateInput> & { id?: string };
  mode?: "create" | "edit";
}

export function ConventionForm({ defaultValues, mode = "create" }: ConventionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tagInput, setTagInput] = useState<Record<string, string>>({});

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
  } = useForm<ConventionCreateInput>({
    resolver: zodResolver(ConventionCreateSchema) as Resolver<ConventionCreateInput>,
    defaultValues: {
      renovacionAutomatica: false,
      responsabilidadFinanciera: false,
      estatus: "vigente",
      direccionesInvolucradas: [],
      modalidadesCooperacion: [],
      areasCooperacion: [],
      ...defaultValues,
    },
  });

  const addTag = (field: "direccionesInvolucradas" | "modalidadesCooperacion" | "areasCooperacion") => {
    const value = tagInput[field]?.trim();
    if (!value) return;
    const current = getValues(field) || [];
    if (!current.includes(value)) {
      setValue(field, [...current, value]);
    }
    setTagInput((prev) => ({ ...prev, [field]: "" }));
  };

  const removeTag = (field: "direccionesInvolucradas" | "modalidadesCooperacion" | "areasCooperacion", index: number) => {
    const current = getValues(field) || [];
    setValue(field, current.filter((_, i) => i !== index));
  };

  const tags = {
    direccionesInvolucradas: watch("direccionesInvolucradas") || [],
    modalidadesCooperacion: watch("modalidadesCooperacion") || [],
    areasCooperacion: watch("areasCooperacion") || [],
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = async (data: any) => {
    setLoading(true);
    setError("");

    try {
      const url = mode === "edit" && defaultValues?.id
        ? `/api/convenios/${defaultValues.id}`
        : "/api/convenios";
      const method = mode === "edit" ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
      setError(err.error || "Error al guardar el instrumento");
        return;
      }

      const result = await res.json();
      toast({
        title: mode === "create" ? "Instrumento creado" : "Instrumento actualizado",
        description: "Los cambios han sido guardados correctamente.",
        variant: "success",
      });
      router.push(`/convenios/${result.id}`);
      router.refresh();
    } catch {
      setError("Error de conexión. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const TagField = ({
    field,
    label,
    placeholder,
  }: {
    field: "direccionesInvolucradas" | "modalidadesCooperacion" | "areasCooperacion";
    label: string;
    placeholder: string;
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={tagInput[field] || ""}
          onChange={(e) => setTagInput((prev) => ({ ...prev, [field]: e.target.value }))}
          placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(field); } }}
        />
        <Button type="button" variant="outline" size="icon" onClick={() => addTag(field)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {tags[field].length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags[field].map((tag: string, i: number) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(field, i)}
                className="hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Identificación */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identificación del instrumento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Código interno (opcional)</Label>
              <Input
                {...register("codigoInterno")}
                placeholder="Ej. CONV-2024-001"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de instrumento *</Label>
              <Select
                defaultValue={defaultValues?.tipoInstrumento}
                onValueChange={(v) => setValue("tipoInstrumento", v as ConventionCreateInput["tipoInstrumento"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="convenio_marco">Acuerdo Marco</SelectItem>
                  <SelectItem value="convenio_especifico">Acuerdo Específico</SelectItem>
                  <SelectItem value="memorando_entendimiento">Memorando de Entendimiento</SelectItem>
                  <SelectItem value="acuerdo_cooperacion">Acuerdo de Cooperación</SelectItem>
                  <SelectItem value="protocolo">Protocolo</SelectItem>
                  <SelectItem value="declaracion_conjunta">Declaración Conjunta</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
              {errors.tipoInstrumento && (
                <p className="text-xs text-red-600">{errors.tipoInstrumento.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Contraparte *</Label>
              <Input
                {...register("contraparte")}
                placeholder="Nombre de la institución contraparte"
              />
              {errors.contraparte && (
                <p className="text-xs text-red-600">{errors.contraparte.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>País *</Label>
              <Input
                {...register("pais")}
                placeholder="País de la contraparte"
              />
              {errors.pais && (
                <p className="text-xs text-red-600">{errors.pais.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Estatus *</Label>
            <Select
              defaultValue={defaultValues?.estatus || "vigente"}
              onValueChange={(v) => setValue("estatus", v as ConventionCreateInput["estatus"])}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vigente">Vigente</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vigencia */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vigencia y duración</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Fecha de firma</Label>
              <Input
                type="date"
                {...register("fechaFirma")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Duración en meses</Label>
              <Input
                type="number"
                {...register("duracionMeses", { valueAsNumber: true })}
                placeholder="Ej. 24"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Días de preaviso</Label>
              <Input
                type="number"
                {...register("diasPreaviso", { valueAsNumber: true })}
                placeholder="Ej. 90"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Duración (texto libre)</Label>
            <Input
              {...register("duracionTexto")}
              placeholder="Ej. Cinco (5) años prorrogables"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Condición de terminación</Label>
            <Textarea
              {...register("condicionTerminacion")}
                placeholder="Describa las condiciones bajo las cuales el instrumento puede ser terminado"
              rows={3}
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="renovacionAutomatica"
              {...register("renovacionAutomatica")}
              className="h-4 w-4 rounded border-slate-300"
            />
            <Label htmlFor="renovacionAutomatica">Renovación automática</Label>
          </div>
        </CardContent>
      </Card>

      {/* Punto focal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Punto focal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nombre del punto focal *</Label>
              <Input
                {...register("puntoFocal")}
                placeholder="Nombre completo"
              />
              {errors.puntoFocal && (
                <p className="text-xs text-red-600">{errors.puntoFocal.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Cargo</Label>
              <Input
                {...register("cargoPuntoFocal")}
                placeholder="Cargo o título"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Correo electrónico</Label>
            <Input
              type="email"
              {...register("correoPuntoFocal")}
              placeholder="correo@institucion.gov"
            />
            {errors.correoPuntoFocal && (
              <p className="text-xs text-red-600">{errors.correoPuntoFocal.message}</p>
            )}
          </div>
          <TagField
            field="direccionesInvolucradas"
            label="Direcciones involucradas"
            placeholder="Nombre de la dirección"
          />
        </CardContent>
      </Card>

      {/* Objeto y alcance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Objeto y alcance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
              <Label>Objetivo del instrumento *</Label>
            <Textarea
              {...register("objetivo")}
              placeholder="Describa el objetivo principal del instrumento..."
              rows={4}
            />
            {errors.objetivo && (
              <p className="text-xs text-red-600">{errors.objetivo.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Impacto esperado</Label>
            <Textarea
              {...register("impactoEsperado")}
              placeholder="Resultados e impacto esperado de la cooperación..."
              rows={3}
            />
          </div>
          <TagField
            field="modalidadesCooperacion"
            label="Modalidades de cooperación"
            placeholder="Ej. Asistencia técnica"
          />
          <TagField
            field="areasCooperacion"
            label="Áreas de cooperación"
            placeholder="Ej. Salud pública"
          />
        </CardContent>
      </Card>

      {/* Aspectos financieros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aspectos financieros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="responsabilidadFinanciera"
              {...register("responsabilidadFinanciera")}
              className="h-4 w-4 rounded border-slate-300"
            />
            <Label htmlFor="responsabilidadFinanciera">
              Implica responsabilidad financiera
            </Label>
          </div>
          <div className="space-y-1.5">
            <Label>Monto referencial (USD)</Label>
            <Input
              type="number"
              step="0.01"
              {...register("montoReferencial", { valueAsNumber: true })}
              placeholder="0.00"
            />
          </div>
        </CardContent>
      </Card>

      {/* Observaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observaciones y notas internas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Observaciones generales</Label>
            <Textarea
              {...register("observaciones")}
              placeholder="Observaciones relevantes sobre el instrumento..."
              rows={3}
            />
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label>Conclusión interna</Label>
            <Textarea
              {...register("conclusionInterna")}
              placeholder="Conclusión institucional interna..."
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Recomendación preliminar</Label>
            <Textarea
              {...register("recomendacionPreliminar")}
              placeholder="Recomendación preliminar de gestión..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pb-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "create" ? "Crear instrumento" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
