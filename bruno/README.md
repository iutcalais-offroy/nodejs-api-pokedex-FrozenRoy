# BUT2 TCG API - Collection Bruno

Collection de requêtes pour tester l'API du jeu de cartes Pokemon-like TCG.

## Architecture de l'API

L'API suit une architecture MVC avec :

- **Routes** : Gestion du routage et des middlewares
- **Controllers** : Logique métier
- **Prisma** : ORM pour la base de données SQLite

## Organisation de la collection

### 🔐 Auth

Endpoints d'authentification (inscription et connexion).

- Sign Up : Créer un nouveau compte
- Sign In : Se connecter avec un compte existant

### 🃏 Cards

Endpoints de gestion des cartes.

- Get All Cards : Récupérer toutes les cartes disponibles

### 📚 Decks

Endpoints CRUD pour les decks de cartes.

- Create Deck : Créer un nouveau deck (20 cartes)
- Get My Decks : Récupérer ses decks
- Get Deck by ID : Récupérer un deck spécifique
- Update Deck : Modifier un deck existant
- Delete Deck : Supprimer un deck

### ❤️ Health Check

Vérifier que l'API est en ligne.

## Variables d'environnement

### Variables automatiques

- `{{token}}` : Token JWT automatiquement sauvegardé après sign-in/sign-up

### Variables de configuration

Configurées dans `environments/local.bru` :

- `{{baseUrl}}` : URL de base de l'API (default: http://localhost:3001)

## Utilisation rapide

1. **Démarrer PostgreSQL** : `npm run db:start` (Docker)
2. **Initialiser la base de données** : `npm run db:migrate` puis `npm run db:seed`
3. **Démarrer l'API** : `npm run dev`
4. **Se connecter** : Utiliser "Sign In" avec red@example.com ou blue@example.com
5. **Tester les endpoints** : Le token est automatiquement utilisé pour les requêtes authentifiées

## Authentification

La plupart des endpoints nécessitent une authentification via JWT token :

- Le token est envoyé dans le header `Authorization: Bearer {{token}}`
- Après un sign-in/sign-up réussi, le token est automatiquement sauvegardé
- Pour se déconnecter, il suffit de supprimer la variable `{{token}}`

## Utilisateurs de test

Voir le README du dossier **Auth** pour les détails des utilisateurs de test créés lors du seed.
