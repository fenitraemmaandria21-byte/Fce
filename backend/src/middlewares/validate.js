const { ApiError } = require('../utils/ApiError');

// Validation Zod obligatoire — jamais de confiance au frontend.
// validate(schema)          → validate le body
// validate(schema, 'query') → validate la query string
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        champ: i.path.join('.'),
        message: i.message,
      }));
      return next(new ApiError(400, 'VALIDATION_ECHEC', 'Données invalides', details));
    }
    req[source] = result.data;
    return next();
  };
}

module.exports = { validate };
