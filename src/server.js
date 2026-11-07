require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const conectarDB = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const productosRoutes = require('./routes/productos.routes');
const uploadRoutes = require('./routes/upload.routes');
const ajustesRoutes = require('./routes/ajustes.routes');

// Si falta alguna variable importante, mejor no arrancar
const REQUERIDAS = ['MONGO_URI', 'JWT_SECRET'];
const faltantes = REQUERIDAS.filter((v) => !process.env[v]);
if (faltantes.length) {
  console.error(`Faltan variables de entorno: ${faltantes.join(', ')}`);
  process.exit(1);
}

const app = express();

// Necesario en Render/Railway para que el rate limit vea la IP real del cliente
app.set('trust proxy', 1);

app.use(helmet());

// FRONTEND_URL puede tener varias URLs separadas por coma
// Ej: http://localhost:4200,https://minute90.vercel.app
const origenesPermitidos = (process.env.FRONTEND_URL || 'http://localhost:4200')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Sin origin = Postman, curl, etc.
      if (!origin || origenesPermitidos.includes(origin)) return callback(null, true);
      callback(new Error('Origen no permitido por CORS'));
    },
  })
);

app.use(express.json({ limit: '1mb' }));

app.get('/api/salud', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ajustes', ajustesRoutes);

// Ruta no encontrada
app.use((req, res) => res.status(404).json({ mensaje: 'Ruta no encontrada' }));

// Manejo general de errores (CORS, JSON mal formado, multer, etc.)
app.use((err, req, res, next) => {
  if (err.message === 'Origen no permitido por CORS') {
    return res.status(403).json({ mensaje: err.message });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ mensaje: 'JSON inválido' });
  }
  if (err.name === 'MulterError') {
    const mensajes = {
      LIMIT_FILE_SIZE: 'Cada imagen debe pesar menos de 5 MB',
      LIMIT_FILE_COUNT: 'Máximo 6 imágenes por subida',
      LIMIT_UNEXPECTED_FILE: 'Campo de archivo inválido (usa "imagenes")',
    };
    return res.status(400).json({ mensaje: mensajes[err.code] || err.message });
  }
  if (err.status === 400) {
    return res.status(400).json({ mensaje: err.message });
  }
  console.error(err);
  res.status(500).json({ mensaje: 'Error en el servidor' });
});

const PORT = process.env.PORT || 4000;

conectarDB().then(() => {
  app.listen(PORT, () => console.log(`API Minute 90 en http://localhost:${PORT}`));
});
