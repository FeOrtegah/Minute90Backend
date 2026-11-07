const express = require('express');
const Ajustes = require('../models/Ajustes');
const soloAdmin = require('../middleware/auth');

const router = express.Router();

const CAMPOS = ['whatsapp', 'instagram', 'puntosEncuentro', 'zonasEnvio', 'datosTransferencia'];

async function obtenerAjustes() {
  let ajustes = await Ajustes.findOne({ clave: 'tienda' });
  if (!ajustes) ajustes = await Ajustes.create({ clave: 'tienda' });
  return ajustes;
}

// GET /api/ajustes  (público: el checkout lo necesita)
router.get('/', async (req, res) => {
  try {
    res.json(await obtenerAjustes());
  } catch (err) {
    res.status(500).json({ mensaje: 'Error obteniendo ajustes' });
  }
});

// PUT /api/ajustes  (solo admin)
router.put('/', soloAdmin, async (req, res) => {
  try {
    const datos = {};
    for (const campo of CAMPOS) {
      if (req.body[campo] !== undefined) datos[campo] = req.body[campo];
    }
    if (datos.whatsapp !== undefined) {
      datos.whatsapp = String(datos.whatsapp).replace(/\D/g, ''); // deja solo números
    }

    await obtenerAjustes();
    const actualizado = await Ajustes.findOneAndUpdate({ clave: 'tienda' }, datos, {
      new: true,
      runValidators: true,
    });
    res.json(actualizado);
  } catch (err) {
    res.status(400).json({ mensaje: 'Datos inválidos', detalle: err.message });
  }
});

module.exports = router;
