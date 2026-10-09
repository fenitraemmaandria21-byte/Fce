// Sentinelles de filtre signifiant « tous » côté UI.
const VALEURS_ALL = ['tous', 'toutes'];

// Un paramètre de filtre n'engage le where que s'il a une valeur réelle.
function actif(valeur) {
  return Boolean(valeur) && !VALEURS_ALL.includes(String(valeur));
}

module.exports = { actif, VALEURS_ALL };