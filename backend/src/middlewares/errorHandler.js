function notFoundHandler(req, res) {
  res.status(404).json({ message: 'Route introuvable', code: 'ROUTE_INTROUVABLE' });
}

// Gestion centralisée des erreurs — format unique pour le frontend.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const code = err.code || 'ERREUR_INTERNE';
  const message =
    status >= 500 ? 'Erreur interne du serveur' : err.message || 'Erreur';

  if (status >= 500) {
    console.error('[FCE-SI][ERROR]', err);
  }

  const body = { message, code };
  if (err.details) body.details = err.details;
  res.status(status).json(body);
}

module.exports = { notFoundHandler, errorHandler };
