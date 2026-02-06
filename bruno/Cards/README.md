# Cartes

## Description

Les cartes sont les entités de base du jeu. Chaque carte représente un Pokemon avec ses statistiques.

## Endpoints disponibles

### Get All Cards

Récupère toutes les cartes disponibles dans le jeu.

**Méthode** : `GET /api/cards`
**Authentification** : Requise (Bearer Token)

**Réponse** : Liste de toutes les cartes triées par numéro Pokédex

```json
[
  {
    "id": "001",
    "name": "Bulbasaur",
    "hp": 45,
    "attack": 49,
    "type": "GRASS",
    "pokedexNumber": 1,
    "imgUrl": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png"
  }
]
```

## Structure d'une carte

| Champ         | Type        | Description                                |
| ------------- | ----------- | ------------------------------------------ |
| id            | string      | Identifiant unique (format: "001")         |
| name          | string      | Nom du Pokemon                             |
| hp            | number      | Points de vie                              |
| attack        | number      | Points d'attaque                           |
| type          | PokemonType | Type du Pokemon (GRASS, FIRE, WATER, etc.) |
| pokedexNumber | number      | Numéro dans le Pokédex                     |
| imgUrl        | string      | URL de l'image du Pokemon                  |

## Types de Pokemon

Les types disponibles sont :

- GRASS (Plante)
- FIRE (Feu)
- WATER (Eau)
- ELECTRIC (Électrique)
- PSYCHIC (Psy)
- NORMAL (Normal)
- FIGHTING (Combat)
- FLYING (Vol)
- POISON (Poison)
- GROUND (Sol)
- ROCK (Roche)
- BUG (Insecte)
- GHOST (Spectre)
- STEEL (Acier)
- ICE (Glace)
- DRAGON (Dragon)
- DARK (Ténèbres)
- FAIRY (Fée)

## Données

Les cartes sont chargées depuis le fichier `prisma/data/pokemon.json` lors du seed de la base de données.
