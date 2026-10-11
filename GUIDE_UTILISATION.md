# Guide d'utilisation — FCE-SI

Plateforme de gestion des opérations de transport ferroviaire de la FCE.
Ce guide explique, étape par étape, comment utiliser chaque partie de l'application.

---

## 1. Se connecter

1. Ouvrir l'application dans le navigateur : `http://localhost:8888`.
2. La **page d'accueil** présente la FCE et ses services ; cliquer sur
   **Se connecter**.
3. Saisir l'**adresse e-mail** et le **mot de passe** du compte.
4. Cliquer sur **Se connecter**.
5. En cas d'erreur, un message rouge s'affiche sous le formulaire ; les jetons
   expirés renvoient automatiquement vers la page de connexion.

> Comptes fournis par l'administrateur. Rôles possibles : **SUPERADMIN**,
> **ADMIN**, **AGENT** (voir §10).

> **Première utilisation (base vide)** : si aucun compte n'existe encore,
> l'écran de connexion affiche **Première initialisation**. Renseigner le nom,
> l'e-mail, un mot de passe (8 caractères min.) et le **secret d'amorçage**
> défini par la variable d'environnement `BOOTSTRAP_SECRET` sur le serveur,
> puis cliquer sur **Créer le superadministrateur**. Cette opération n'est
> possible qu'une seule fois : ensuite, les comptes se gèrent via
> **Administration › Utilisateurs** (§10).

---

## 2. Comprendre l'écran principal

- **Barre latérale (gauche)** : navigation groupée — *Pilotage*,
  *Exploitation*, *Communication*, *Administration*, *Assistance*. Utiliser le bouton **☰** (en haut
  à gauche) pour la replier/déplier : le logo s'adapte automatiquement.
- **En-tête** : fil d'Ariane (emplacement) + bouton **?** (aide) + rôle de
  l'utilisateur connecté.
- **Menu utilisateur** (en bas de la barre latérale) : e-mail, rôle et
  **Se déconnecter**.
- **Listes** : chaque page dispose d'un **filtre**, d'un bouton **Carte/Tableau**
  et d'un bouton **Actualiser**.

> Un guide intégré est aussi disponible à tout moment via **Assistance ›
> Comment utiliser ?** ou le bouton **?** de l'en-tête.

---

## 3. Accueil et tableau de bord (Pilotage)

1. **Accueil** : page de présentation de la FCE et de ses services (billetterie,
   fret, locations, documents, statistiques). Également visible avant connexion.
2. **Tableau de bord** : cliquer dessus, consulter les indicateurs clés et les
   graphiques, puis changer la période pour recalculer les chiffres.

---

## 4. Référentiels (exploitation de base)

Ces écrans servent à configurer les données de base. Les manipuler avec prudence :
ils alimentent les calculs (tarifs, capacités).

| Référentiel | Rôle |
|---|---|
| **Gares** | Liste des gares desservies |
| **Arrêts** | Points d'arrêt (ex. PK102, PK115, PK123) |
| **Tarifs** | Tarifs billets et locations |
| **Trains** | Parc de trains |
| **Voitures** | Voitures par train |
| **Wagons** | Wagons par série |

Les valeurs non confirmées apparaissent avec un badge **À valider**.

---

## 5. Vendre un billet

1. Ouvrir **Exploitation → Billets**.
2. Cliquer sur **Nouveau billet**.
3. Renseigner : gare de départ, gare d'arrivée, classe, catégorie
   (adulte/enfant), nombre de voyageurs, identité du voyageur.
4. Valider : le billet est **Vendu**.
5. Pour réimprimer, cliquer sur l'icône **Imprimer** de la ligne (l'impression
   ne s'ouvre plus automatiquement à la vente).
6. Annulation : possible depuis la ligne ; un billet **Annulé** ne peut plus
   être modifié.

---

## 6. Envoyer des marchandises

1. Ouvrir **Exploitation → Marchandises**.
2. Cliquer sur **Nouvel envoi**.
3. Renseigner le client, la nature et le poids/détail des marchandises.
4. Enregistrer.
5. Depuis la ligne, cliquer sur l'**œil** pour voir le détail complet.
6. Supprimer un envoi supprime aussi son **BRAN** ; la suppression est bloquée
   uniquement si des **arrivages** y sont rattachés (un message l'explique).

---

## 7. Gérer les arrivages

1. Ouvrir **Exploitation → Arrivages**.
2. Créer un arrivage et le rattacher à l'envoi concerné.
3. Mettre à jour le statut au fil du transport
   (Enregistré → Facturé → Arrivé → Remis).
4. Générer puis **imprimer le BRAN** depuis la ligne quand nécessaire.

---

## 8. Locations (avec début ET fin)

1. Ouvrir **Exploitation → Locations**.
2. Cliquer sur **Nouvelle location**.
3. Choisir le **type** : Draisine, Machine, Bâtiment ou Terrain.
4. Renseigner le client, la zone/le départ, la formule et le nombre de personnes.
5. Indiquer la **date de début** et surtout la **date de fin** : la durée est
   calculée automatiquement. Une colonne **Fin** et un badge **Échéance**
   (*À venir / En cours / Terminée*) indiquent quand la location se termine.
6. Enregistrer : statut **En attente**.
7. Un administrateur **Valide** ou **Refuse**. Une fois **Validée** et avec un
   montant, le **RFE** peut être généré et imprimé.

> La date de fin est **obligatoire** pour une Machine (retour) et **optionnelle**
> pour les autres types.

---

## 9. Documents et impression

- **BRAN** et **RFE** ne figurent plus dans le menu : on les génère depuis
  **Marchandises** (BRAN) et **Locations** (RFE), puis on les imprime.
- **Imprimer** un document : icône d'impression de la ligne ; seul le document
  est imprimé (mise en page dédiée).

---

## 10. Rôles et Administration

| Rôle | Droits principaux |
|---|---|
| **SUPERADMIN** | Tout, y compris **Paramètres** et **Utilisateurs** |
| **ADMIN** | Validation, documents (BRAN/RFE), utilisateurs |
| **AGENT** | Saisie courante (billets, envois, arrivages, locations) |

Menu **Administration** :

1. **Utilisateurs** : créer un compte, définir son rôle, activer/désactiver.
2. **Clients** : créer et gérer la fiche client (nom, contact, adresse).
3. **Paramètres** (SUPERADMIN) : capacités, règles et tarifs d'exploitation.

---

## 11. Messagerie interne

La messagerie permet aux utilisateurs de l'application de s'écrire entre eux.

1. Ouvrir **Communication → Messagerie** dans la barre latérale.
2. Cliquer sur **Nouvelle conversation**, choisir un ou plusieurs destinataires
   (boutons rapides : *Tous les agents*, *Tous les admins*, *Tout le monde*).
3. Ajouter un **sujet** (facultatif pour une discussion individuelle) et écrire le
   message. Des **fichiers** peuvent être joints (images, PDF, Word/Excel, texte —
   10 Mo max, 5 fichiers par message).
4. À plusieurs destinataires, un **groupe** est créé ; à un seul destinataire, la
   discussion individuelle existante est réutilisée.

Dans une conversation :

- Le fil se rafraîchit automatiquement (environ toutes les 7 secondes).
- **Vider** masque l'historique pour vous seulement ; **Quitter** retire la
  conversation de votre liste.
- Une icône corbeille supprime **vos propres** messages ; les messages des autres
  ne peuvent pas être supprimés.
- Le **badge du menu** et un compteur dans la liste indiquent les messages non lus.

---

## 12. Statistiques

1. Ouvrir **Statistiques** (accessible depuis la barre latérale).
2. Filtrer par période et par type d'activité.
3. Exporter les résultats si besoin.

---

## 13. Astuces et bonnes pratiques

- Toujours **rafraîchir** après une saisie si la liste semble figée.
- Les messages (notifications en haut à droite) disparaissent tout seuls ;
  survoler les met en pause.
- Ne jamais inventer une donnée métier (gare, tarif, capacité) : les valeurs non
  confirmées sont marquées **À valider**.
- Se déconnecter via le menu utilisateur en quittant un poste partagé.

---

## 14. Dépannage rapide

| Symptôme | Piste |
|---|---|
| « API injoignable » | Vérifier que Docker tourne (`docker compose ps`) |
| Renvoyé à la connexion | Jeton expiré — se reconnecter |
| Bouton Supprimer inactif | Suppression interdite (arrivages liés, statut verrouillé…) |
| Donnée « À valider » | Valeur du référentiel non encore confirmée |
