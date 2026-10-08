const { asyncHandler } = require('../utils/db');
const authService = require('../services/authService');

const login = asyncHandler(async (req, res) => {
  const resultat = await authService.login(req.body.email, req.body.motDePasse);
  res.json(resultat);
});

const me = asyncHandler(async (req, res) => {
  const profil = await authService.profil(req.utilisateur.id);
  res.json(profil);
});

const logout = (req, res) => {
  res.json(authService.logout());
};

module.exports = { login, me, logout };
