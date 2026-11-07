const jwt = require('jsonwebtoken');

// Protege rutas de admin: exige header "Authorization: Bearer <token>"
function soloAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const [tipo, token] = header.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ mensaje: 'No autorizado' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.adminId = payload.id;
    next();
  } catch {
    return res.status(401).json({ mensaje: 'Sesión expirada o inválida' });
  }
}

module.exports = soloAdmin;
