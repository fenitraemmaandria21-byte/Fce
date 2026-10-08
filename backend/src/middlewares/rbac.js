const { ApiError } = require('../utils/ApiError');

// Autorisation par rôle — la sécurité est appliquée côté backend.
// requireRole('SUPERADMIN')
// requireRole('SUPERADMIN', 'ADMIN')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.utilisateur) {
      return next(new ApiError(401, 'NON_AUTHENTIFI', 'Authentification requise'));
    }
    if (!roles.includes(req.utilisateur.role)) {
      return next(
        new ApiError(
          403,
          'ACCES_REFUSE',
          `Accès refusé — rôle insuffisant (requis : ${roles.join(' ou ')})`
        )
      );
    }
    return next();
  };
}

module.exports = { requireRole };
