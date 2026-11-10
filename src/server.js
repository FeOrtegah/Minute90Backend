require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const conectarDB = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const productosRoutes = require('./routes/productos.routes');
const uploadRoutes = require('./routes/upload.routes');
const ajustesRoutes = require('./routes/ajustes.routes');

const faltantes = ['MONGO_URI', 'JWT_SECRET'].filter((v) => !process.env[v]);
if (faltantes.length) {
  console.error(`Faltan variables de entorno: ${faltantes.join(', ')}`);
}

const app = express();

// Necesario en Vercel/Render para que el rate limit vea la IP real del cliente
app.set('trust proxy', 1);

app.use(helmet());

// FRONTEND_URL puede tener varias URLs separadas por coma
// Ej: http://localhost:4200,https://minute90.vercel.app
const origenesPermitidos = (process.env.FRONTEND_URL || 'http://localhost:4200')
  .split(',')
  .map((u) => u.trim().replace(/\/$/, ''))
  .filter(Boolean);

// Links de vista previa que Vercel crea en cada deploy del front
// Ej: https://minute90-7ydl09yiv-minute-90.vercel.app
const PREVIEW_VERCEL = /^https:\/\/minute90-[a-z0-9-]+-minute-90\.vercel\.app$/;

app.use(
  cors({
    origin(origin, callback) {
      // Sin origin = Postman, curl, abrir la URL directo en el navegador
      if (!origin || origenesPermitidos.includes(origin) || PREVIEW_VERCEL.test(origin)) {
        return callback(null, true);
      }
      callback(new Error('Origen no permitido por CORS'));
    },
  })
);

app.use(express.json({ limit: '1mb' }));

app.get('/', (req, res) => res.json({ api: 'Minute 90', ok: true }));
app.get('/api/salud', (req, res) => res.json({ ok: true }));

// Asegura la conexión a MongoDB antes de cualquier ruta que la use
app.use(async (req, res, next) => {
  try {
    await conectarDB();
    next();
  } catch (err) {
    console.error('Error conectando a MongoDB:', err.message);
    res.status(503).json({ mensaje: 'Base de datos no disponible, intenta en unos segundos' });
  }
});

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
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ mensaje: 'Datos demasiado grandes' });
  }
  if (err.name === 'MulterError') {
    const mensajes = {
      LIMIT_FILE_SIZE: 'La imagen debe pesar menos de 4 MB',
      LIMIT_FILE_COUNT: 'Sube una imagen a la vez',
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

// En local (npm run dev / npm start) levanta el servidor.
// En Vercel no se ejecuta: Vercel usa el app exportado.
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  conectarDB()
    .then(() => app.listen(PORT, () => console.log(`API Minute 90 en http://localhost:${PORT}`)))
    .catch((err) => {
      console.error('Error conectando a MongoDB:', err.message);
      process.exit(1);
    });
}

module.exports = app;