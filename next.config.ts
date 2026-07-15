import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  /**
   * El menú pasó de 6 ítems sueltos a los 5 del flujo (Carga → Memorandos →
   * Ficha → Seguimiento → Comparación). Estas rutas ya no existen, pero pueden
   * estar en enlaces guardados o compartidos por correo.
   */
  async redirects() {
    return [
      { source: "/dashboard", destination: "/convenios", permanent: false },
      { source: "/documentos", destination: "/ingreso", permanent: false },
      { source: "/documentos/nuevo", destination: "/ingreso", permanent: false },
      { source: "/alertas", destination: "/seguimiento?tab=alertas", permanent: false },
    ];
  },
};

export default nextConfig;
