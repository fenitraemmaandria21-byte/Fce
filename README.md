# FCE-SI

Plateforme web de gestion des opérations de transport ferroviaire de la FCE
(Fianarantsoa Côte Est).

## Architecture

```
React (Vite)  →  Express.js REST API  →  Prisma ORM  →  PostgreSQL (Docker)
```

## Technologies

- **Frontend** : React, JavaScript, Vite, React Router, Tailwind CSS, shadcn/ui,
  React Icons, Axios, React Hook Form, Zod, React Toastify, SweetAlert2, Recharts
- **Backend** : Node.js, Express.js, Prisma ORM, JWT, bcrypt
- **Base de données** : PostgreSQL 16 (Docker Desktop / Docker Compose)
- **Environnement** : Docker Desktop, Docker Compose, Git

## Structure du projet

```
fenitra/
├── backend/
│   ├── src/
│   │   ├── config/        # configuration (env, database)
│   │   ├── controllers/
│   │   ├── middlewares/   # auth, RBAC, erreurs
│   │   ├── routes/
│   │   ├── services/
│   │   ├── validators/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── prisma/schema.prisma
│   ├── .env
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

## Prérequis

1. Node.js >= 20 (`node --version`)
2. npm (`npm --version`)
3. Docker Desktop (avec WSL 2)
4. Git

## Installation

### 1. Configuration des variables d'environnement

```bash
cp .env.example .env
```

Puis renseigner les valeurs réelles (notamment `POSTGRES_PASSWORD`,
`DATABASE_URL`, `JWT_SECRET`). Le fichier `.env` est ignoré par Git.

### 2. Démarrage de PostgreSQL (Docker)

```bash
docker compose up -d
docker compose ps
docker compose logs postgres
```

### 2 bis. Conteneurs complets (Dockerfile)

Le projet fournit un `Dockerfile` pour chaque application :

| Service | Image | Port |
|---|---|---|
| `postgres` | postgres:16-alpine | 5432 |
| `backend` | build `./backend` (node:22-bookworm-slim) | 4000 |
| `frontend` | build `./frontend` (build Vite + nginx) | 8888 |

```bash
# Tout construire et démarrer
docker compose up -d --build

# Vérifier
docker compose ps
docker compose logs -f backend

# Application : http://localhost:8888 (nginx proxye /api vers le backend)
```

- Le backend applique `prisma migrate deploy` au démarrage.
- Le frontend est servi par nginx ; `nginx.conf` proxy `/api/` → `backend:4000`.
- Les variables Docker (`FRONTEND_URL_DOCKER`, `DATABASE_URL` interne) sont dans `.env`.

> En développement local, on peut n'utiliser que PostgreSQL dans Docker
> (`docker compose up -d postgres`) et lancer backend/frontend avec npm.


### 3. Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

L'API démarre sur `http://localhost:4000`.
Vérification : `http://localhost:4000/api/health`

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

L'application démarre sur `http://localhost:5173`.

## Commandes utiles

| Commande | Description |
|---|---|
| `docker compose up -d` | Démarrer PostgreSQL |
| `docker compose ps` | État des conteneurs |
| `docker compose logs postgres` | Logs PostgreSQL |
| `docker compose down` | Arrêter les conteneurs (sans supprimer les données) |
| `npx prisma generate` | Générer le client Prisma |
| `npx prisma migrate dev` | Appliquer les migrations |
| `npx prisma studio` | Explorer la base de données |
| `npm run build` | Build de production du frontend |

> **Note** : ne jamais exécuter `docker compose down -v` sans justification
> (cela supprime le volume PostgreSQL et les données de développement).

## Sécurité

- JWT + bcrypt pour l'authentification
- Helmet, CORS, rate limiting
- Validation des entrées (Zod côté frontend, validation backend obligatoire)
- RBAC : rôles `SUPERADMIN`, `ADMIN`, `AGENT` — le backend est l'autorité finale
- Aucun secret dans Git (`.env` ignoré)

## Règle métier

Ne jamais inventer de donnée métier non validée (gare, tarif, capacité,
règle de calcul...). Utiliser explicitement `CONFIGURATION_A_VALIDER`,
`REGLE_A_CONFIRMER` ou `TODO_METIER`.
