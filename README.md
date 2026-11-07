# Minute 90 — Backend

API en Express + MongoDB Atlas + Cloudinary para la tienda de camisetas Minute 90.

## Instalación

```bash
npm install
cp .env.example .env   # en Windows: copy .env.example .env
# completar .env
npm run crear-admin -- correo@ejemplo.cl ClaveSegura123
npm run dev
```

## Endpoints

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | /api/salud | público | Health check |
| POST | /api/auth/login | público | `{ email, password }` → `{ token, email }` |
| GET | /api/auth/me | admin | Valida el token |
| PUT | /api/auth/password | admin | `{ actual, nueva }` |
| GET | /api/productos | público | Filtros: `buscar, equipo, liga, tipo, talla, destacado` |
| GET | /api/productos/filtros | público | Equipos, ligas y tallas disponibles |
| GET | /api/productos/:id | público | Detalle |
| GET | /api/productos/admin/todos | admin | Incluye productos ocultos |
| POST | /api/productos | admin | Crear |
| PUT | /api/productos/:id | admin | Editar |
| DELETE | /api/productos/:id | admin | Eliminar (borra también sus imágenes) |
| POST | /api/upload | admin | form-data `imagenes` (máx. 6, 5 MB c/u) → `[{ url, publicId }]` |
| GET | /api/ajustes | público | WhatsApp, puntos de encuentro, zonas de envío, datos de transferencia |
| PUT | /api/ajustes | admin | Editar ajustes |

Rutas admin: header `Authorization: Bearer <token>`.
