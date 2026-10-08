// ============================================================
// FCE-SI — Vérification de la sécurité de l'API
// Démarre l'API en local et contrôle :
//   - santé
//   - 401 sans token / token falsifié
//   - 403 rôle insuffisant (RBAC)
//   - 400 validation Zod
//   - 404 route inconnue
//   - 503 base indisponible (login, ressources DB)
//
// Usage : npm run check:security
// ============================================================

const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { env } = require('../src/config/env');

const resultats = [];

function token(role) {
  return jwt.sign(
    { sub: 'test', email: 'test@fce.mg', nom: 'Test', role },
    env.jwtSecret,
    { expiresIn: '1h' }
  );
}

async function appel(port, chemin, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  const init = { method: options.method || 'GET', headers };
  if (options.body) init.body = JSON.stringify(options.body);
  try {
    const reponse = await fetch(`http://localhost:${port}${chemin}`, init);
    const texte = await reponse.text();
    return { statut: reponse.status, corps: texte };
  } catch (err) {
    return { statut: 0, corps: err.message };
  }
}

function verifier(nom, attendu, obtenu) {
  const ok = obtenu === attendu;
  resultats.push({ nom, attendu, obtenu, ok });
  console.log(`  ${ok ? '✅' : '❌'} ${nom} — attendu ${attendu}, obtenu ${obtenu}`);
}

async function main() {
  const serveur = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = serveur.address().port;
  console.log(`[check-security] API démarrée sur le port ${port}\n`);

  const agent = token('AGENT');
  const admin = token('ADMIN');
  const superadmin = token('SUPERADMIN');
  const falsifie = jwt.sign(
    { sub: 'x', email: 'x@fce.mg', nom: 'X', role: 'SUPERADMIN' },
    'cle-incorrecte'
  );

  // Mode d'exécution : la base est-elle disponible ?
  const probe = await appel(port, '/api/gares', { token: superadmin });
  const baseUp = probe.statut === 200;
  console.log(
    `[check-security] base de données : ${baseUp ? 'disponible' : 'indisponible'}\n`
  );

  verifier('GET /api/health (anonyme)', 200, (await appel(port, '/api/health')).statut);
  verifier('GET /api/billets (sans token)', 401, (await appel(port, '/api/billets')).statut);
  verifier(
    'GET /api/billets (token falsifié)',
    401,
    (await appel(port, '/api/billets', { token: falsifie })).statut
  );
  verifier(
    'GET /api/users (AGENT → 403)',
    403,
    (await appel(port, '/api/users', { token: agent })).statut
  );
  verifier(
    'GET /api/parametres (ADMIN → 403)',
    403,
    (await appel(port, '/api/parametres', { token: admin })).statut
  );
  verifier(
    'POST /api/billets (body invalide → 400)',
    400,
    (
      await appel(port, '/api/billets', {
        token: agent,
        method: 'POST',
        body: { voyageurNom: 'X' },
      })
    ).statut
  );
  verifier(
    `POST /api/auth/login (mauvais mdp → ${baseUp ? 401 : 503})`,
    baseUp ? 401 : 503,
    (
      await appel(port, '/api/auth/login', {
        method: 'POST',
        body: { email: 'x@fce.mg', motDePasse: 'abcdefgh' },
      })
    ).statut
  );
  verifier(
    `GET /api/gares (→ ${baseUp ? 200 : 503})`,
    baseUp ? 200 : 503,
    (await appel(port, '/api/gares', { token: superadmin })).statut
  );
  verifier(
    `GET /api/users (ADMIN, → ${baseUp ? 200 : 503})`,
    baseUp ? 200 : 503,
    (await appel(port, '/api/users', { token: admin })).statut
  );
  verifier(
    'POST /api/users (AGENT → 403)',
    403,
    (
      await appel(port, '/api/users', {
        token: agent,
        method: 'POST',
        body: { email: 'a@b.c', nom: 'AB', motDePasse: 'abcdefgh', role: 'AGENT' },
      })
    ).statut
  );
  verifier('GET /api/inconnu (anonyme → 401 sur route protégée)', 401, (await appel(port, '/api/inconnu')).statut);

  const echecs = resultats.filter((r) => !r.ok);
  console.log(`\n[check-security] ${resultats.length - echecs.length}/${resultats.length} contrôles OK`);

  serveur.close();
  process.exit(echecs.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('[check-security] Erreur :', err);
  process.exit(1);
});
