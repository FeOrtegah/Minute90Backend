const express = require('express');
const mongoose = require('mongoose');
const Producto = require('../models/Producto');
const soloAdmin = require('../middleware/auth');
const { borrarImagen, borrarCarpeta } = require('../config/cloudinary');

const router = express.Router();

const CAMPOS_PERMITIDOS = [
  'nombre', 'equipo', 'liga', 'temporada', 'tipo', 'descripcion',
  'precio', 'precioOferta', 'tallas', 'imagenes', 'carpeta', 'destacado', 'activo',
];

// Solo deja pasar los campos que el admin puede editar
function limpiarBody(body) {
  const datos = {};
  for (const campo of CAMPOS_PERMITIDOS) {
    if (body[campo] !== undefined) datos[campo] = body[campo];
  }
  return datos;
}

function idValido(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function escaparRegex(texto) {
  return String(texto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* ------------------------- RUTAS PÚBLICAS ------------------------- */

// GET /api/productos?buscar=&equipo=&liga=&tipo=&talla=&destacado=true
router.get('/', async (req, res) => {
  try {
    const { buscar, equipo, liga, tipo, talla, destacado } = req.query;
    const filtro = { activo: true };

    if (equipo) filtro.equipo = new RegExp(`^${escaparRegex(equipo)}$`, 'i');
    if (liga) filtro.liga = new RegExp(`^${escaparRegex(liga)}$`, 'i');
    if (tipo) filtro.tipo = String(tipo);
    if (talla) filtro.tallas = { $elemMatch: { talla: String(talla), stock: { $gt: 0 } } };
    if (destacado === 'true') filtro.destacado = true;
    if (buscar) {
      const re = new RegExp(escaparRegex(buscar), 'i');
      filtro.$or = [{ nombre: re }, { equipo: re }, { liga: re }];
    }

    const productos = await Producto.find(filtro).sort({ destacado: -1, createdAt: -1 });
    res.json(productos);
  } catch (err) {
    res.status(500).json({ mensaje: 'Error obteniendo productos' });
  }
});

// GET /api/productos/filtros  -> equipos y ligas existentes (para armar los filtros del catálogo)
router.get('/filtros', async (req, res) => {
  try {
    const [equipos, ligas] = await Promise.all([
      Producto.distinct('equipo', { activo: true }),
      Producto.distinct('liga', { activo: true }),
    ]);
    res.json({
      equipos: equipos.sort(),
      ligas: ligas.filter(Boolean).sort(),
      tallas: Producto.TALLAS,
    });
  } catch (err) {
    res.status(500).json({ mensaje: 'Error obteniendo filtros' });
  }
});

/* -------------------------- RUTAS ADMIN --------------------------- */
// (van antes de /:id para que "admin" no se tome como un id)

// GET /api/productos/admin/todos  -> incluye productos ocultos
router.get('/admin/todos', soloAdmin, async (req, res) => {
  try {
    const productos = await Producto.find().sort({ createdAt: -1 });
    res.json(productos);
  } catch (err) {
    res.status(500).json({ mensaje: 'Error obteniendo productos' });
  }
});

// GET /api/productos/admin/:id  -> detalle aunque esté oculto (para editar)
router.get('/admin/:id', soloAdmin, async (req, res) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ mensaje: 'Producto no encontrado' });
    const producto = await Producto.findById(req.params.id);
    if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado' });
    res.json(producto);
  } catch (err) {
    res.status(500).json({ mensaje: 'Error obteniendo producto' });
  }
});

// POST /api/productos
router.post('/', soloAdmin, async (req, res) => {
  try {
    const producto = await Producto.create(limpiarBody(req.body));
    res.status(201).json(producto);
  } catch (err) {
    res.status(400).json({ mensaje: 'Datos inválidos', detalle: err.message });
  }
});

// PUT /api/productos/:id
router.put('/:id', soloAdmin, async (req, res) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ mensaje: 'Producto no encontrado' });

    const anterior = await Producto.findById(req.params.id);
    if (!anterior) return res.status(404).json({ mensaje: 'Producto no encontrado' });

    const datos = limpiarBody(req.body);
    const actualizado = await Producto.findByIdAndUpdate(req.params.id, datos, {
      new: true,
      runValidators: true,
    });

    // Si se quitaron imágenes, se borran de Cloudinary
    if (datos.imagenes) {
      const nuevos = new Set(datos.imagenes.map((img) => img.publicId));
      const quitadas = anterior.imagenes.filter((img) => !nuevos.has(img.publicId));
      await Promise.allSettled(quitadas.map((img) => borrarImagen(img.publicId)));
    }

    res.json(actualizado);
  } catch (err) {
    res.status(400).json({ mensaje: 'Datos inválidos', detalle: err.message });
  }
});

// DELETE /api/productos/:id
router.delete('/:id', soloAdmin, async (req, res) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ mensaje: 'Producto no encontrado' });

    const producto = await Producto.findByIdAndDelete(req.params.id);
    if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado' });

    // Borra sus fotos y su carpeta en Cloudinary
    await Promise.allSettled(producto.imagenes.map((img) => borrarImagen(img.publicId)));
    if (producto.carpeta) await borrarCarpeta(producto.carpeta);
    res.json({ mensaje: 'Producto eliminado' });
  } catch (err) {
    res.status(500).json({ mensaje: 'Error eliminando producto' });
  }
});

/* ------------------- DETALLE (PÚBLICO) AL FINAL ------------------- */

// GET /api/productos/:id
router.get('/:id', async (req, res) => {
  try {
    if (!idValido(req.params.id)) return res.status(404).json({ mensaje: 'Producto no encontrado' });

    const producto = await Producto.findOne({ _id: req.params.id, activo: true });
    if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado' });
    res.json(producto);
  } catch (err) {
    res.status(500).json({ mensaje: 'Error obteniendo producto' });
  }
});

module.exports = router;