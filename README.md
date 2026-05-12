# Sistema de Gestión de Convenios Internacionales

Plataforma institucional para la gestión inteligente de convenios, acuerdos y memorandos internacionales con extracción automática de información mediante IA.

---

## Características principales

- **Gestión integral** de convenios, acuerdos y memorandos internacionales
- **Extracción automática** de información con OpenAI (Structured Outputs)
- **Sistema de alertas** por vencimiento y revisión pendiente
- **Borradores IA** de ficha técnica, resumen ejecutivo y recomendación
- **Almacenamiento documental** en Vercel Blob (PDF y DOCX)
- **Dashboard ejecutivo** con métricas y estado en tiempo real
- **Roles de acceso** (admin / viewer)
- **Historial de cambios** y trazabilidad de acciones IA

---

## Stack tecnológico

| Tecnología | Uso |
|------------|-----|
| Next.js 16 (App Router) | Framework principal |
| TypeScript | Tipado estricto |
| Tailwind CSS v4 | Estilos |
| shadcn/ui + Radix UI | Componentes UI |
| Prisma ORM v7 | Acceso a base de datos |
| PostgreSQL | Base de datos |
| Zod | Validaciones |
| React Hook Form | Formularios |
| OpenAI API | Extracción IA |
| Vercel Blob | Almacenamiento de documentos |
| Jose | JWT para autenticación |
| bcryptjs | Hash de contraseñas |

---

## Requisitos

- Node.js >= 18
- PostgreSQL >= 14
- Cuenta en Vercel (para producción)
- API Key de OpenAI
- Token de Vercel Blob

---

## Instalación local

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd convenios-app
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus valores:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/convenios_db"
OPENAI_API_KEY="sk-..."
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
JWT_SECRET="tu-secreto-seguro-aqui"
CRON_SECRET="tu-cron-secret-aqui"
NEXT_PUBLIC_APP_NAME="Sistema de Convenios"
```

### 3. Configurar base de datos

**Opción A: PostgreSQL local con Prisma**
```bash
# Inicia el servidor Prisma local (incluye PostgreSQL)
npx prisma dev
```

**Opción B: PostgreSQL externo**
Configura `DATABASE_URL` apuntando a tu base de datos PostgreSQL.

### 4. Aplicar schema y seed

```bash
# Aplicar schema
npm run db:push

# Cargar datos demo
npm run db:seed
```

### 5. Iniciar en desarrollo

```bash
npm run dev
```

Accede en `http://localhost:3000`

---

## Credenciales demo

| Usuario | Email | Contraseña | Rol |
|---------|-------|------------|-----|
| Administrador | admin@demo.com | admin123 | admin |
| Analista | viewer@demo.com | viewer123 | viewer |

---

## Variables de entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `DATABASE_URL` | Connection string PostgreSQL | ✅ |
| `OPENAI_API_KEY` | API Key de OpenAI | ✅ |
| `OPENAI_MODEL_EXTRACT` | Modelo para extracción (default: gpt-4.1-nano) | ❌ |
| `OPENAI_MODEL_SUMMARY` | Modelo para resúmenes (default: gpt-4.1-nano) | ❌ |
| `OPENAI_MODEL_RECOMMEND` | Modelo para recomendaciones (default: gpt-4.1-nano) | ❌ |
| `BLOB_READ_WRITE_TOKEN` | Token de Vercel Blob | ✅ (producción) |
| `JWT_SECRET` | Secreto para tokens JWT | ✅ |
| `CRON_SECRET` | Secreto para proteger endpoint cron | ✅ (producción) |
| `NEXT_PUBLIC_APP_NAME` | Nombre de la aplicación | ❌ |
| `APP_URL` | URL base de la app | ❌ |

---

## Configuración de Vercel Blob

1. En Vercel Dashboard → Storage → Create Blob Store
2. Conectar al proyecto o copiar el token `BLOB_READ_WRITE_TOKEN`
3. Agregar como variable de entorno en Vercel

Los documentos se almacenan con acceso público bajo el path:
```
convenios/{conventionId}/{timestamp}-{filename}
```

---

## Configuración de OpenAI

### 1. Crear y configurar la API Key

1. Ve a [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Crea una nueva API Key con los permisos necesarios
3. **Importante:** Añade créditos de pago en [https://platform.openai.com/settings/billing](https://platform.openai.com/settings/billing) — sin créditos recibirás error 429 (quota exceeded)

### 2. Variables de entorno

Agrega en `.env.local` (desarrollo) o en el panel de Vercel (producción):

```env
OPENAI_API_KEY=sk-proj-...      # Tu API Key real — NUNCA la commits al repositorio
OPENAI_MODEL_EXTRACT=gpt-4.1-nano
OPENAI_MODEL_SUMMARY=gpt-4.1-nano
OPENAI_MODEL_RECOMMEND=gpt-4.1-nano
```

**Modelos recomendados** (del más barato al más capaz):
| Modelo | Uso recomendado | Costo |
|--------|-----------------|-------|
| `gpt-4.1-nano` | Extracción, resúmenes, recomendaciones | Mínimo |
| `gpt-4o-mini` | Mayor calidad de extracción | Bajo |
| `gpt-4.1` | Documentos complejos o ambiguos | Moderado |

### 3. Verificar la conexión

Una vez configurado, prueba en:

```
GET /api/health/openai
```

Respuesta esperada:
```json
{
  "ok": true,
  "model": "gpt-4.1-nano",
  "latencyMs": 850,
  "message": "Conexión exitosa. Modelo gpt-4.1-nano responde en 850ms.",
  "config": {
    "keyConfigured": true,
    "keyPrefix": "sk-proj-inE…",
    "modelExtract": "gpt-4.1-nano",
    "modelSummary": "gpt-4.1-nano",
    "modelRecommend": "gpt-4.1-nano"
  }
}
```

También puedes usar el botón **"Probar conexión"** en `/configuracion`.

### 4. Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `401 Unauthorized` | API Key inválida | Verifica `OPENAI_API_KEY` |
| `429 quota exceeded` | Sin créditos | Añade créditos en platform.openai.com/billing |
| `404 model not found` | Modelo no existe | Cambia `OPENAI_MODEL_*` a `gpt-4.1-nano` o `gpt-4o-mini` |
| `timeout` | Documento muy largo | El sistema trunca a 14 000 chars automáticamente |

### 5. Configuración en Vercel (producción)

En el panel de Vercel → Project Settings → Environment Variables:

```
OPENAI_API_KEY      → tu key real (marcar como Secret)
OPENAI_MODEL_EXTRACT → gpt-4.1-nano
OPENAI_MODEL_SUMMARY → gpt-4.1-nano
OPENAI_MODEL_RECOMMEND → gpt-4.1-nano
```

**Reglas de seguridad implementadas:**
- La `OPENAI_API_KEY` NUNCA se expone al navegador
- Solo se usa en Route Handlers con `runtime = "nodejs"`
- Si la variable no está configurada, el sistema devuelve error claro sin crashear
- Los stack traces nunca llegan al cliente

### Flujo de extracción IA

```
Sube documento → Vercel Blob
         ↓
Extrae texto del documento
         ↓
Llama a OpenAI Responses API (Structured Outputs)
         ↓
Valida JSON con Zod
         ↓
Aplica campos al convenio
         ↓
Genera alertas automáticas
         ↓
Guarda trazabilidad en BD
```

---

## Despliegue en Vercel

### 1. Conectar repositorio

En [vercel.com](https://vercel.com) → Import Project → selecciona tu repositorio

### 2. Configurar variables de entorno

En Settings → Environment Variables, agrega todas las variables del `.env.example`.

> **Importante:** Para `DATABASE_URL`, usa una base de datos en la nube compatible:
> - [Neon](https://neon.tech) (recomendado, tier gratuito disponible)
> - [Supabase](https://supabase.com)
> - [Railway](https://railway.app)

### 3. Configurar Vercel Blob

```bash
# Si tienes Vercel CLI instalado
vercel env pull .env.local
```

O manualmente desde el dashboard de Vercel → Storage → Blob.

### 4. Aplicar schema en producción

```bash
# Asegúrate de que DATABASE_URL apunte a producción
npx prisma db push
```

### 5. Ejecutar seed en producción (opcional)

```bash
npx tsx prisma/seed.ts
```

---

## Cron Jobs en Vercel

El archivo `vercel.json` configura un cron diario:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily",
      "schedule": "0 6 * * *"
    }
  ]
}
```

El endpoint recalcula automáticamente todas las alertas cada día a las 6:00 AM UTC.

> **Nota:** Los Cron Jobs de Vercel requieren plan Pro o superior para ejecución más frecuente.
> En el plan Hobby están disponibles con frecuencia limitada (1 por día).

### Protección del endpoint cron

El endpoint `/api/cron/daily` verifica el header `Authorization: Bearer {CRON_SECRET}`.

Para ejecutar manualmente:
```bash
curl -X GET https://tu-app.vercel.app/api/cron/daily \
  -H "Authorization: Bearer tu-cron-secret"
```

---

## Ejecución manual del recálculo de alertas

Desde la interfaz (solo admins): 
- Ir a `/alertas` → botón "Recalcular alertas"

Desde API:
```bash
curl -X POST https://tu-app.vercel.app/api/alertas/recalcular \
  -H "Cookie: auth-token=<token>"
```

---

## Probar extracción IA

1. Crea o selecciona un convenio
2. Ve a la pestaña **Documentos**
3. Sube un PDF o DOCX del convenio
4. Haz clic en **"Extraer con IA"**
5. El sistema extrae automáticamente los campos y los aplica al convenio
6. Revisa y valida los datos extraídos

---

## Estructura del proyecto

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Rutas de autenticación
│   ├── (dashboard)/       # Rutas protegidas del dashboard
│   └── api/               # API Routes (serverless)
├── components/
│   ├── layout/            # Sidebar, Topbar
│   ├── shared/            # Componentes reutilizables
│   └── ui/                # Componentes shadcn/ui
├── features/              # Módulos de funcionalidad
│   ├── convenios/
│   ├── alertas/
│   └── documentos/
├── lib/                   # Utilidades core
│   ├── auth.ts            # JWT y sesiones
│   ├── blob.ts            # Vercel Blob
│   ├── openai.ts          # OpenAI integration
│   └── prisma.ts          # Prisma client
├── repositories/          # Acceso a datos
├── services/              # Lógica de negocio
├── types/                 # Tipos TypeScript
└── validators/            # Schemas Zod
```

---

## Comandos útiles

```bash
npm run dev          # Desarrollo
npm run build        # Build producción
npm run db:push      # Sincronizar schema con DB
npm run db:seed      # Cargar datos demo
npm run db:studio    # Abrir Prisma Studio
npm run db:migrate   # Ejecutar migraciones
```

---

## Seguridad

- Contraseñas hasheadas con bcrypt (10 rounds)
- Tokens JWT firmados con HS256, expiran en 8h
- Cookies httpOnly y secure en producción
- OpenAI API key nunca expuesta al cliente
- Uploads validados por tipo MIME y tamaño (max 10MB)
- Endpoints cron protegidos con secret header
- Roles admin/viewer para control de acceso

---

## Notas de compatibilidad con Vercel

- ✅ Sin almacenamiento local persistente (todo en Vercel Blob)
- ✅ Funciones serverless con runtime Node.js
- ✅ Compatible con Vercel Cron Jobs
- ✅ Variables de entorno gestionadas por Vercel
- ✅ Imágenes remotas configuradas para Vercel Blob domain
- ✅ Build sin errores en Vercel
