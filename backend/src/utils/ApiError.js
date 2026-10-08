// Erreur API centralisée : status HTTP + code métier + détails optionnels.
class ApiError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

module.exports = { ApiError };
