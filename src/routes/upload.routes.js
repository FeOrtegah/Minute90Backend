const express = require('express');
const multer = require('multer');
const soloAdmin = require('../middleware/auth');
const Producto = require('../models/Producto');
const { subirImagen, borrarImagen, borrarCarpeta, carpetaSegura, slug, CARPETA_BASE } = require('../config/cloudinary');

const router = express.Router();

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];

// Las imágenes quedan en memoria y se mandan directo a Cloudinary.
// Vercel corta peticiones de más de 4.5 MB, por eso el front comprime
// cada foto y las sube de a una.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 6 },
  fileFilter(req, file, cb) {
    if (TIPOS_PERMITIDOS.includes(file.mimetype)) return cb(null, true);
    const error = new Error('Solo se permiten imágenes JPG, PNG o WEBP');
    error.status = 400;
    cb(error);
  },
});

// POST /api/upload/carpeta  { nombre }
// Reserva un nombre de carpeta para un producto nuevo a partir de su nombre.
// Si ya existe un producto con esa carpeta, agrega -2, -3...
// Responde: { carpeta: "minute90/productos/colo-colo-local-2025" }
router.post('/carpeta', soloAdmin, async (req, res) => {
  try {
    const base = slug(req.body.nombre) || 'producto';
    let carpeta = `${CARPETA_BASE}/${base}`;
    for (let n = 2; await Producto.exists({ carpeta }); n++) {
      carpeta = `${CARPETA_BASE}/${base}-${n}`;
    }
    res.json({ carpeta });
  } catch (err) {
    res.status(500).json({ mensaje: 'No se pudo crear la carpeta' });
  }
});

// POST /api/upload  (form-data: "imagenes" + "carpeta")
// Responde: [{ url, publicId }, ...]  -> el front los guarda en producto.imagenes
router.post('/', soloAdmin, upload.array('imagenes', 6), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ mensaje: 'No se envió ninguna imagen' });
    }
    const carpeta = carpetaSegura(req.body.carpeta);
    if (!carpeta) return res.status(400).json({ mensaje: 'Falta la carpeta del producto' });

    const subidas = await Promise.all(req.files.map((f) => subirImagen(f.buffer, carpeta)));
    res.status(201).json(subidas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error subiendo imágenes' });
  }
});

// POST /api/upload/eliminar  { publicIds: [...], carpeta? }
// Borra fotos que se subieron pero nunca se guardaron en un producto
// (el admin las quitó o canceló). Si se manda carpeta y queda vacía, también se borra.
router.post('/eliminar', soloAdmin, async (req, res) => {
  try {
    const publicIds = Array.isArray(req.body.publicIds) ? req.body.publicIds.map(String) : [];

    // No se borran fotos que ya pertenecen a un producto guardado
    const enUso = await Producto.exists({ 'imagenes.publicId': { $in: publicIds } });
    if (enUso) return res.status(400).json({ mensaje: 'Esas fotos pertenecen a un producto guardado' });

    await Promise.allSettled(publicIds.map((id) => borrarImagen(id)));

    const carpeta = carpetaSegura(req.body.carpeta);
    if (carpeta && !(await Producto.exists({ carpeta }))) await borrarCarpeta(carpeta);

    res.json({ mensaje: 'Fotos eliminadas' });
  } catch (err) {
    res.status(500).json({ mensaje: 'Error eliminando fotos' });
  }
});

module.exports = router;