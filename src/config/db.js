const mongoose = require('mongoose');

let conexion = null;

async function conectarDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  if (!conexion) {
    conexion = mongoose
      .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 })
      .then((m) => {
        console.log('MongoDB conectado');
        return m.connection;
      })
      .catch((err) => {
        conexion = null; // permite reintentar en la próxima petición
        throw err;
      });
  }
  return conexion;
}

module.exports = conectarDB;