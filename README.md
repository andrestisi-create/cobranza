# Cobranza y Pre-Cobranza · UA Blended

Sistema de **cobranza** y **pre-cobranza** para empresa de educación. Además de la cobranza
tradicional, hace seguimiento de ventas **Sence** que aún no tienen documento tributario, donde el
pago lo realiza una **OTIC** y/o una **Empresa** mediante una o varias **Órdenes de Compra (OC)**.

> Diferencia clave: **el pago se asocia al `RecordID` del negocio, no a la factura/boleta**. El
> documento tributario es meramente informativo.

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **PostgreSQL** + **Prisma ORM**
- **Auth.js (NextAuth v5)** — login con roles (ADMIN, SUPERVISOR, COBRADOR)
- **Tailwind CSS v4**
- Despliegue con **Docker** / **Coolify**

## Funcionalidades

- **Dashboard** con métricas (monto total, cobrado, saldo, Sence sin documento).
- **Cobranza**: tabla interactiva (filtros, orden, búsqueda) con **panel lateral** por negocio
  → datos del alumno, pagos (registrar/eliminar) y órdenes de compra (Sence).
- **Pre-cobranza**: ventas Sence sin documento tributario + sus OCs (OTIC/Empresa) + registro de documento.
- **CRUD** de Alumnos, Programas y Negocios.
- **Usuarios** y roles (solo ADMIN).

## Roles

| Rol        | Permisos |
|------------|----------|
| ADMIN      | Todo, incluida gestión de usuarios |
| SUPERVISOR | Ver todo, editar negocios/pagos/OCs/CRUD; sin usuarios |
| COBRADOR   | Ver cobranza/pre-cobranza y registrar pagos |

## Variables de entorno

Copia `.env.example` a `.env` y completa:

```env
DATABASE_URL="postgresql://usuario:password@host:5432/cobranza?schema=public"
AUTH_SECRET="<secreto largo aleatorio>"   # genera con: npx auth secret
AUTH_URL="https://cobranza.ifabriano.cl"  # en local: http://localhost:3000
AUTH_TRUST_HOST="true"
```

## Desarrollo local

Requiere una base PostgreSQL accesible (local o en la nube).

```bash
npm install
npx prisma migrate deploy      # aplica la migración inicial
npm run db:seed                # carga admin + datos de prueba
npm run dev                    # http://localhost:3000
```

## Usuarios iniciales (seed)

| Email                  | Contraseña     | Rol      |
|------------------------|----------------|----------|
| atisi@uablended.cl     | `Rock*1982`    | ADMIN    |
| cobrador@uablended.cl  | `Cobrador*2024`| COBRADOR |

> Cambia estas contraseñas tras el primer ingreso.

## Despliegue en Coolify (VPS)

Dominio de producción: **https://cobranza.ifabriano.cl**

1. **Sube este repo a GitHub.**
2. En **Coolify** → *New Resource → Database → PostgreSQL*. Copia el connection string interno.
3. En **Coolify** → *New Resource → Application → desde GitHub*, rama `main`, **Build Pack: Dockerfile**.
4. **Environment Variables** de la aplicación:
   - `DATABASE_URL` = connection string del PostgreSQL de Coolify
   - `AUTH_SECRET` = secreto aleatorio (`npx auth secret`)
   - `AUTH_URL` = `https://cobranza.ifabriano.cl`
   - `AUTH_TRUST_HOST` = `true`
5. **Domains**: `https://cobranza.ifabriano.cl` (SSL automático). Apunta el DNS del subdominio a la IP del VPS.
6. **Pre-deployment Command**: `npx prisma migrate deploy`
7. **Deploy.** Tras el primer deploy, ejecuta el seed una vez desde la *Terminal* del contenedor en Coolify:
   ```bash
   npm run db:seed
   ```
8. Coolify reconstruye y redepliega automáticamente con cada `git push` a `main`.

## Modelo de datos (resumen)

`Usuario` · `Alumno` · `Programa` · **`Negocio`** (tabla madre) · `OrdenCompra` (Sence) ·
`Pago` (ligado al `RecordID`) · `DocumentoTributario` (informativo).

Esquema completo en [`prisma/schema.prisma`](prisma/schema.prisma).
