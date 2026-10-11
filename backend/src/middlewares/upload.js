const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { env } = require('../config/env');
const { ApiError } = require('../utils/ApiError');

const DOSSIER_PIECES_JOINTES = path.join(env.uploadsDir, 'messages');
fs.mkdirSync(DOSSIER_PIECES_JOINTES, { recursive: true });

const TYPES_AUTORISES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]);

const TAILLE_MAX = 10 * 1024 * 1024; // 10 Mo
const NB_MAX = 5;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, DOSSIER_PIECES_JOINTES),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').slice(0, 12).replace(/[^.\w-]/g, '');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!TYPES_AUTORISES.has(file.mimetype)) {
    return cb(
      new ApiError(400, 'FICHIER_TYPE_REFUSE', `Type de fichier non autorisé : ${file.mimetype}`)
    );
  }
  return cb(null, true);
}

const televersement = multer({ storage, fileFilter, limits: { fileSize: TAILLE_MAX, files: NB_MAX } }).array(
  'fichiers',
  NB_MAX
);

// Encapsule multer pour convertir ses erreurs en ApiError explicites.
function uploadPiecesJointes(req, res, next) {
  televersement(req, res, (err) => {
    if (!err) return next();
    if (err instanceof ApiError) return next(err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new ApiError(400, 'FICHIER_TROP_VOLUMINEUX', 'Fichier trop volumineux (10 Mo max)'));
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new ApiError(400, 'TROP_DE_FICHIERS', `Maximum ${NB_MAX} fichiers par message`));
    }
    return next(new ApiError(400, 'TELEVERSEMENT_ECHEC', 'Téléversement impossible'));
  });
}

module.exports = { uploadPiecesJointes, DOSSIER_PIECES_JOINTES };
