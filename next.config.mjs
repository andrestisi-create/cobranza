/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // El lint no debe bloquear el build de producción en Coolify.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
