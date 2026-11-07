const express = require('express');
const multer = require('multer');
const soloAdmin = require('../middleware/auth');
const { subirImagen } = require('../config/cloudinary');

const router = express.Router();

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];

// Las imágenes quedan en memoria y se mandan directo a Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
  fileFilter(req, file, cb) {
    if (TIPOS_PERMITIDOS.includes(file.mimetype)) return cb(null, true);
    const error = new Error('Solo se permiten imágenes JPG, PNG o WEBP');
    error.status = 400;
    cb(error);
  },
});

// POST /api/upload  (form-data, campo "imagenes", hasta 6 archivos)
// Responde: [{ url, publicId }, ...]  -> el front los guarda en producto.imagenes
router.post('/', soloAdmin, upload.array('imagenes', 6), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ mensaje: 'No se envió ninguna imagen' });
    }
    const subidas = await Promise.all(req.files.map((f) => subirImagen(f.buffer)));
    res.status(201).json(subidas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error subiendo imágenes' });
  }
});

module.exports = router;
