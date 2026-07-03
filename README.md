# contigo-api

API principal del proyecto **ContigoCerca**.

Maneja la logica de negocio del sistema: autenticacion, usuarios, prestadores, reservas y administracion.

## Rol dentro de la arquitectura

```text
Frontend -> contigo-bff :8000 -> contigo-api :3001 -> PostgreSQL
```

`contigo-api` no es consumida directamente por el frontend. Su cliente esperado es `contigo-bff`.

## Responsabilidades

- registro e inicio de sesion,
- autenticacion con Google,
- emision y validacion de JWT,
- perfil del usuario autenticado,
- listado y detalle de prestadores,
- disponibilidad,
- creacion y cancelacion de reservas,
- operaciones administrativas.

## Tecnologias

- Node.js
- Express
- PostgreSQL (`pg`)
- jsonwebtoken
- bcryptjs
- google-auth-library
- dotenv
- cors
- helmet
- morgan
- nodemon

## Instalacion

```bash
npm install
cp .env.example .env
npm run dev
```

## Variables de entorno

Principales variables:

- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ORIGIN`
- `GOOGLE_CLIENT_ID`

Ejemplo:

```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/contigo_db
JWT_SECRET=contigo_secret_key_change_me
JWT_EXPIRES_IN=1d
CORS_ORIGIN=http://localhost:8000
GOOGLE_CLIENT_ID=your_google_client_id_here
```

## Endpoints principales

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| GET | /health | No | Estado del servicio |
| POST | /api/v1/auth/register | No | Registro de usuario |
| POST | /api/v1/auth/login | No | Login tradicional |
| POST | /api/v1/auth/google | No | Login con Google |
| GET | /api/v1/auth/me | JWT | Perfil del usuario autenticado |
| GET | /api/v1/providers | No | Listado de prestadores |
| GET | /api/v1/providers/:id | No | Detalle de prestador |
| GET | /api/v1/providers/:id/availability | No | Disponibilidad horaria |
| PUT | /api/v1/providers/me | JWT prestador | Actualizar perfil |
| GET | /api/v1/providers/me/bookings | JWT prestador | Reservas del prestador |
| GET | /api/v1/bookings/me | JWT | Reservas del cliente |
| POST | /api/v1/bookings | JWT | Crear reserva |
| PATCH | /api/v1/bookings/:id/cancel | JWT | Cancelar reserva |
| GET | /api/v1/admin/providers | JWT admin | Gestion de prestadores |
| PATCH | /api/v1/admin/providers/:id/validate | JWT admin | Aprobar o rechazar prestador |
| GET | /api/v1/admin/bookings | JWT admin | Ver reservas del sistema |
| GET | /api/v1/admin/stats | JWT admin | Estadisticas generales |

## Formato de respuesta

Las respuestas siguen una estructura JSON consistente:

```json
{
  "success": true,
  "message": "Descripcion del resultado",
  "data": {}
}
```

## Scripts

- `npm run dev`: servidor con nodemon
- `npm start`: servidor en modo produccion

## Consideraciones de arquitectura

- `contigo-api` es la API donde vive la logica de negocio principal.
- Aqui tiene sentido definir y utilizar `JWT_SECRET`, ya que esta capa emite y valida tokens.
- La base de datos es accedida directamente desde esta API mediante PostgreSQL.
- El frontend no deberia consumir esta API en forma directa; debe hacerlo a traves del BFF.
