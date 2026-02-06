# Decks

## Description

Un deck est une collection de 10 cartes appartenant à un utilisateur. Les decks sont utilisés pour jouer des parties.

## Règles de validation

- Un deck doit contenir **exactement 10 cartes**
- Toutes les cartes doivent exister dans la base de données
- Les cartes peuvent être dupliquées dans un deck

## Endpoints disponibles

### Create Deck

Crée un nouveau deck pour l'utilisateur authentifié.

**Méthode** : `POST /api/decks`
**Authentification** : Requise
**Body** :

```json
{
  "name": "My Starter Deck",
  "cards": ["001", "004", "007", ...] // 10 IDs de cartes
}
```

**Réponse** : Le deck créé avec ses cartes

---

### Get My Decks

Récupère tous les decks de l'utilisateur authentifié.

**Méthode** : `GET /api/decks/mine`
**Authentification** : Requise

**Réponse** : Liste des decks avec leurs cartes

---

### Get Deck by ID

Récupère un deck spécifique par son ID.

**Méthode** : `GET /api/decks/:id`
**Authentification** : Requise
**Variables nécessaires** : `{{deckId}}`

**Réponse** : Le deck avec ses cartes

---

### Update Deck

Met à jour le nom et/ou les cartes d'un deck existant.

**Méthode** : `PATCH /api/decks/:id`
**Authentification** : Requise
**Variables nécessaires** : `{{deckId}}`
**Body** (tous les champs sont optionnels) :

```json
{
  "name": "Updated Deck Name",
  "cards": ["006", "009", "012", ...] // 10 IDs de cartes
}
```

**Notes** :

- Si `cards` est fourni, il doit contenir exactement 10 IDs valides
- Les anciennes cartes sont entièrement remplacées si un tableau est fourni
- Si seul `name` est fourni, les cartes restent inchangées

**Réponse** : Le deck mis à jour

---

### Delete Deck

Supprime définitivement un deck.

**Méthode** : `DELETE /api/decks/:id`
**Authentification** : Requise
**Variables nécessaires** : `{{deckId}}`

**Réponse** :

```json
{
  "message": "Deck deleted successfully"
}
```

## Variables automatiques

Après avoir récupéré vos decks avec "Get My Decks", l'ID du premier deck est automatiquement sauvegardé dans la variable `{{deckId}}` pour faciliter les tests des autres endpoints.

## Structure d'un deck

| Champ     | Type       | Description                      |
| --------- | ---------- | -------------------------------- |
| id        | string     | Identifiant unique (UUID)        |
| name      | string     | Nom du deck                      |
| userId    | string     | ID de l'utilisateur propriétaire |
| cards     | DeckCard[] | Liste des cartes du deck         |
| createdAt | Date       | Date de création                 |
| updatedAt | Date       | Date de dernière modification    |

## Decks de test

Les utilisateurs Red et Blue ont chacun un deck pré-créé lors du seed :

- **Red's Deck** : 20 cartes aléatoires
- **Blue's Deck** : 20 cartes aléatoires

Vous pouvez les récupérer avec "Get My Decks" après vous être connecté avec red@example.com ou blue@example.com.
