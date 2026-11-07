const mongoose = require('mongoose');

// Datos de la tienda que el dueño puede cambiar desde el panel admin.
// Hay un solo documento de ajustes (clave: 'tienda').
const ajustesSchema = new mongoose.Schema(
  {
    clave: { type: String, default: 'tienda', unique: true },

    // Número al que llegan los pedidos, solo dígitos con código país. Ej: 56912345678
    whatsapp: { type: String, trim: true, default: '' },

    instagram: { type: String, trim: true, default: '' },

    // Puntos de encuentro que el cliente puede elegir en el checkout
    puntosEncuentro: { type: [String], default: [] },

    // Comunas/zonas con envío y su costo
    zonasEnvio: {
      type: [
        new mongoose.Schema(
          {
            nombre: { type: String, required: true, trim: true },
            costo: { type: Number, min: 0, default: 0 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },

    // Texto con los datos para transferir (se muestra al elegir transferencia)
    datosTransferencia: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ajustes', ajustesSchema);
