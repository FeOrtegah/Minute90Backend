// Crea (o resetea la contraseña de) la cuenta admin.
// Uso: npm run crear-admin -- correo@ejemplo.cl ClaveSegura123
require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../src/models/Admin');

async function main() {
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    console.log('Uso: npm run crear-admin -- correo@ejemplo.cl ClaveSegura123');
    process.exit(1);
  }
  if (password.length < 8) {
    console.log('La contraseña debe tener al menos 8 caracteres');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  let admin = await Admin.findOne({ email: email.toLowerCase() });
  if (admin) {
    admin.password = password;
    await admin.save();
    console.log(`Contraseña actualizada para ${admin.email}`);
  } else {
    admin = await Admin.create({ email, password });
    console.log(`Admin creado: ${admin.email}`);
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Error:', err.message);
  await mongoose.disconnect();
  process.exit(1);
});
