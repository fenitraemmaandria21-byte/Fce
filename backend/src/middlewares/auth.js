const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { ApiError } = require('../utils/ApiError');

// Authentification JWT (stateless).
// Le backend est l'autorité : aucun accès sans token valide.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next(new ApiError(401, 'NON_AUTHENTIFI', 'Authentification requise'));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.utilisateur = {
      id: payload.sub,
      email: payload.email,
      nom: payload.nom,
      role: payload.role,
    };
    return next();
  } catch (err) {
    return next(new ApiError(401, 'TOKEN_INVALIDE', 'Session invalide ou expirée'));
  }
}

module.exports = { requireAuth };
