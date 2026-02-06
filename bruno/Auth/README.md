# Authentification

## Utilisateurs de test (Seed)

Deux utilisateurs sont créés automatiquement lors du seed de la base de données :

| Nom  | Email            | Password    | Decks préexistants |
| ---- | ---------------- | ----------- | ------------------ |
| Red  | red@example.com  | password123 | 1 deck (20 cartes) |
| Blue | blue@example.com | password123 | 1 deck (20 cartes) |

## Fichiers disponibles

### Sign In

Connectez-vous avec l'utilisateur **Red** :

- Email: `red@example.com`
- Password: `password123`

### Sign In (Blue)

Connectez-vous avec l'utilisateur **Blue** :

- Email: `blue@example.com`
- Password: `password123`

### Sign Up

Créez un **nouveau** compte utilisateur.

⚠️ **Important** : Utilisez un email différent des utilisateurs du seed (ex: `ash@example.com`, `misty@example.com`, etc.)

## Variables automatiques

Après un sign in ou sign up réussi, le **token JWT** est automatiquement sauvegardé dans la variable `{{token}}` et sera utilisé pour toutes les requêtes authentifiées.
