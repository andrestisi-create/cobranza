/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // El lint no debe bloquear el build de producción en Coolify.
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      // Las cargas masivas CSV (miles de filas) envían el archivo completo
      // como JSON en el body del Server Action; el default de 1mb es muy
      // bajo para archivos grandes (ej. negocios con ~7000 filas).
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
