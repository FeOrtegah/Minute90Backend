const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const Admin = require('../models/Admin');
const soloAdmin = require('../middleware/auth');

const router = express.Router();

// Máximo 10 intentos de login cada 15 minutos por IP
const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { mensaje: 'Demasiados intentos, espera unos minutos' },
});

// POST /api/auth/login
router.post('/login', limiteLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ mensaje: 'Email y contraseña son obligatorios' });
    }

    const admin = await Admin.findOne({ email: String(email).toLowerCase() }).select('+password');
    if (!admin || !(await admin.compararPassword(String(password)))) {
      return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
    }

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES || '8h',
    });

    res.json({ token, email: admin.email });
  } catch (err) {
    res.status(500).json({ mensaje: 'Error en el servidor' });
  }
});

// GET /api/auth/me  -> para que el front valide si el token sigue vigente
router.get('/me', soloAdmin, async (req, res) => {
  const admin = await Admin.findById(req.adminId);
  if (!admin) return res.status(401).json({ mensaje: 'No autorizado' });
  res.json({ email: admin.email });
});

// PUT /api/auth/password  -> el dueño cambia su contraseña
router.put('/password', soloAdmin, async (req, res) => {
  try {
    const { actual, nueva } = req.body;
    if (!actual || !nueva || nueva.length < 8) {
      return res.status(400).json({ mensaje: 'La nueva contraseña debe tener al menos 8 caracteres' });
    }

    const admin = await Admin.findById(req.adminId).select('+password');
    if (!admin || !(await admin.compararPassword(actual))) {
      return res.status(401).json({ mensaje: 'La contraseña actual no es correcta' });
    }

    admin.password = nueva;
    await admin.save();
    res.json({ mensaje: 'Contraseña actualizada' });
  } catch (err) {
    res.status(500).json({ mensaje: 'Error en el servidor' });
  }
});

module.exports = router;
