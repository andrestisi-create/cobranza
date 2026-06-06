/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: {
    // El lint no debe bloquear el build de producción en Coolify.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
