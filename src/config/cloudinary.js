const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Todas las fotos de productos viven bajo esta carpeta
const CARPETA_BASE = 'minute90/productos';

// "Colo-Colo Local 2025!" -> "colo-colo-local-2025"
function slug(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita tildes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// Acepta "colo-colo-local-2025" o "minute90/productos/colo-colo-local-2025"
// y devuelve siempre una ruta segura dentro de CARPETA_BASE (o null si no sirve)
function carpetaSegura(carpeta) {
  const nombre = String(carpeta || '').replace(`${CARPETA_BASE}/`, '');
  const limpio = slug(nombre);
  return limpio ? `${CARPETA_BASE}/${limpio}` : null;
}

// Sube un buffer (archivo en memoria) a la carpeta del producto
function subirImagen(buffer, carpeta) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: carpeta || CARPETA_BASE,
        transformation: [{ width: 1400, height: 1400, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

async function borrarImagen(publicId) {
  // Solo se permite borrar fotos de la tienda
  if (!publicId || !String(publicId).startsWith('minute90/')) return;
  await cloudinary.uploader.destroy(publicId, { invalidate: true });
}

// Borra la carpeta del producto (Cloudinary solo deja borrar carpetas vacías,
// por eso primero se borra lo que quede adentro)
async function borrarCarpeta(carpeta) {
  const ruta = carpetaSegura(carpeta);
  if (!ruta) return;
  try {
    await cloudinary.api.delete_resources_by_prefix(`${ruta}/`);
  } catch {
    /* puede no tener nada */
  }
  try {
    await cloudinary.api.delete_folder(ruta);
  } catch {
    /* puede no existir */
  }
}

module.exports = { subirImagen, borrarImagen, borrarCarpeta, carpetaSegura, slug, CARPETA_BASE };