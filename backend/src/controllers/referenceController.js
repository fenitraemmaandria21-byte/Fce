const { asyncHandler } = require('../utils/db');
const referenceService = require('../services/referenceService');

const listerGares = asyncHandler(async (req, res) => {
  res.json(await referenceService.listerGares(req));
});

const modifierGare = asyncHandler(async (req, res) => {
  res.json(await referenceService.modifierGare(req.params.id, req.body, req.utilisateur));
});

const supprimerGare = asyncHandler(async (req, res) => {
  res.json(await referenceService.supprimerGare(req.params.id, req.utilisateur));
});

const listerZones = asyncHandler(async (req, res) => {
  res.json(await referenceService.listerZones());
});

const listerArrets = asyncHandler(async (req, res) => {
  res.json(await referenceService.listerArrets());
});

const modifierArret = asyncHandler(async (req, res) => {
  res.json(await referenceService.modifierArret(req.params.id, req.body, req.utilisateur));
});

const supprimerArret = asyncHandler(async (req, res) => {
  res.json(await referenceService.supprimerArret(req.params.id, req.utilisateur));
});

const listerTarifsBillet = asyncHandler(async (req, res) => {
  res.json(await referenceService.listerTarifsBillet(req));
});

const modifierTarifBillet = asyncHandler(async (req, res) => {
  res.json(
    await referenceService.modifierTarifBillet(req.params.id, req.body, req.utilisateur)
  );
});

const supprimerTarifBillet = asyncHandler(async (req, res) => {
  res.json(await referenceService.supprimerTarifBillet(req.params.id, req.utilisateur));
});

const listerTarifsLocation = asyncHandler(async (req, res) => {
  res.json(await referenceService.listerTarifsLocation(req));
});

const modifierTarifLocation = asyncHandler(async (req, res) => {
  res.json(
    await referenceService.modifierTarifLocation(req.params.id, req.body, req.utilisateur)
  );
});

const supprimerTarifLocation = asyncHandler(async (req, res) => {
  res.json(await referenceService.supprimerTarifLocation(req.params.id, req.utilisateur));
});

const listerTrains = asyncHandler(async (req, res) => {
  res.json(await referenceService.listerTrains());
});

const modifierTrain = asyncHandler(async (req, res) => {
  res.json(await referenceService.modifierTrain(req.params.id, req.body, req.utilisateur));
});

const supprimerTrain = asyncHandler(async (req, res) => {
  res.json(await referenceService.supprimerTrain(req.params.id, req.utilisateur));
});

const listerVoitures = asyncHandler(async (req, res) => {
  res.json(await referenceService.listerVoitures());
});

const modifierVoiture = asyncHandler(async (req, res) => {
  res.json(await referenceService.modifierVoiture(req.params.id, req.body, req.utilisateur));
});

const supprimerVoiture = asyncHandler(async (req, res) => {
  res.json(await referenceService.supprimerVoiture(req.params.id, req.utilisateur));
});

const listerWagons = asyncHandler(async (req, res) => {
  res.json(await referenceService.listerWagons(req));
});

const modifierWagon = asyncHandler(async (req, res) => {
  res.json(await referenceService.modifierWagon(req.params.id, req.body, req.utilisateur));
});

const supprimerWagon = asyncHandler(async (req, res) => {
  res.json(await referenceService.supprimerWagon(req.params.id, req.utilisateur));
});

const listerParametres = asyncHandler(async (req, res) => {
  res.json(await referenceService.listerParametres());
});

const modifierParametre = asyncHandler(async (req, res) => {
  res.json(
    await referenceService.modifierParametre(req.params.cle, req.body, req.utilisateur)
  );
});

const supprimerParametre = asyncHandler(async (req, res) => {
  res.json(await referenceService.supprimerParametre(req.params.cle, req.utilisateur));
});

module.exports = {
  listerGares,
  modifierGare,
  supprimerGare,
  listerZones,
  listerArrets,
  modifierArret,
  supprimerArret,
  listerTarifsBillet,
  listerTarifsLocation,
  modifierTarifBillet,
  modifierTarifLocation,
  supprimerTarifBillet,
  supprimerTarifLocation,
  listerTrains,
  modifierTrain,
  supprimerTrain,
  listerVoitures,
  modifierVoiture,
  supprimerVoiture,
  listerWagons,
  modifierWagon,
  supprimerWagon,
  listerParametres,
  modifierParametre,
  supprimerParametre,
};