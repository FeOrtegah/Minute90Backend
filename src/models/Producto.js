const mongoose = require('mongoose');

const TALLAS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '4', '6', '8', '10', '12', '14', '16'];

const tallaSchema = new mongoose.Schema(
  {
    talla: { type: String, enum: TALLAS, required: true },
    stock: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const imagenSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false }
);

const productoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },          // Ej: "Colo-Colo Local 2025"
    equipo: { type: String, required: true, trim: true },          // Ej: "Colo-Colo"
    liga: { type: String, trim: true, default: '' },               // Ej: "Chile", "Premier League", "Selecciones"
    temporada: { type: String, trim: true, default: '' },          // Ej: "2025", "1998"
    tipo: {
      type: String,
      enum: ['local', 'visita', 'tercera', 'retro', 'entrenamiento', 'otro'],
      default: 'local',
    },
    descripcion: { type: String, trim: true, default: '' },
    precio: { type: Number, required: true, min: 0 },
    precioOferta: { type: Number, min: 0, default: null },
    tallas: { type: [tallaSchema], default: [] },
    imagenes: { type: [imagenSchema], default: [] },
    carpeta: { type: String, trim: true, default: '' },            // Carpeta en Cloudinary, ej: minute90/productos/colo-colo-local-2025
    destacado: { type: Boolean, default: false },
    activo: { type: Boolean, default: true },                      // false = oculto en la tienda
  },
  { timestamps: true }
);

productoSchema.index({ nombre: 'text', equipo: 'text', liga: 'text' });
productoSchema.index({ carpeta: 1 });

module.exports = mongoose.model('Producto', productoSchema);
module.exports.TALLAS = TALLAS;