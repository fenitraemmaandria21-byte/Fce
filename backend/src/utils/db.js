const { Prisma } = require('@prisma/client');
const { ApiError } = require('./ApiError');

// Codes Prisma (erreurs requête) liés à la base.
const CODES_REQUETE = new Map([
  ['P2021', [503, 'DB_NON_MIGREE', 'Table introuvable — migrations à appliquer']],
  ['P2022', [503, 'DB_NON_MIGREE', 'Colonne introuvable — migrations à appliquer']],
  ['P2002', [409, 'DOUBLON', "Contrainte d'unicité violée"]],
  ['P2025', [404, 'RESSOURCE_INTROUVE', 'Ressource introuvable']],
]);

function convertirErreurPrisma(err) {
  if (err instanceof ApiError) return null;

  if (err instanceof Prisma.PrismaClientInitializationError) {
    return new ApiError(503, 'DB_INDISPONIBLE', 'Base de données indisponible');
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = CODES_REQUETE.get(err.code);
    if (mapped) return new ApiError(mapped[0], mapped[1], mapped[2]);
    return null;
  }
  if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    return new ApiError(503, 'DB_INDISPONIBLE', 'Base de données indisponible');
  }
  return null;
}

// Exécute une opération base de données et convertit les erreurs Prisma
// en erreurs API explicites (jamais de données fictives).
async function dbCall(fn) {
  try {
    return await fn();
  } catch (err) {
    const convertie = convertirErreurPrisma(err);
    if (convertie) throw convertie;
    throw err;
  }
}

// Enveloppe une route async → errors transmises à errorHandler.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { dbCall, asyncHandler };
