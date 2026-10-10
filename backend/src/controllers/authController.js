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

const statutAmorcage = asyncHandler(async (req, res) => {
  const statut = await authService.statutAmorcage();
  res.json(statut);
});

const amorcer = asyncHandler(async (req, res) => {
  const user = await authService.amorcer(req.body);
  res.status(201).json({ utilisateur: user });
});

module.exports = { login, me, logout, statutAmorcage, amorcer };
