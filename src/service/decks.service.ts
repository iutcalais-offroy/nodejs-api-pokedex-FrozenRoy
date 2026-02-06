import { prisma } from '../database'

/**
 * Service pour la gestion des decks de cartes
 * Gère la logique métier et les opérations en base de données pour les decks.
 */

export class DecksService {
  /**
   * Crée un nouveau deck avec les cartes spécifiées
   * Vérifie que le deck contient exactement 10 cartes et que toutes existent.
   *
   * @param {string} name - Nom du deck
   * @param {number[]} cardIds - Tableau contenant exactement 10 IDs de cartes
   * @param {number} userId - ID de l'utilisateur propriétaire
   * @returns {Promise<Deck>} Promesse contenant le deck créé avec ses cartes
   *
   * @throws {Error} "Un deck doit contenir exactement 10 cartes" - Si le nombre de cartes n'est pas 10
   * @throws {Error} "Certaines cartes n'existent pas" - Si certains IDs ne correspondent à aucune carte
   * @throws {Error} Erreur Prisma si problème lors de la création en base
   *
   * @example
   * const deck = await decksService.createDeck("Mon Deck", [1,2,3,4,5,6,7,8,9,10], 1);
   */

  async createDeck(name: string, cardIds: number[], userId: number) {
    // Vérifier que le deck contient exactement 10 cartes
    if (cardIds.length !== 10) {
      throw new Error('Un deck doit contenir exactement 10 cartes')
    }

    // Vérifier que toutes les cartes existent
    const cards = await prisma.card.findMany({
      where: {
        id: { in: cardIds },
      },
    })

    if (cards.length !== 10) {
      throw new Error("Certaines cartes n'existent pas")
    }

    // Créer le deck avec les cartes associées
    const deck = await prisma.deck.create({
      data: {
        name,
        userId,
        deckcard: {
          create: cardIds.map((cardId) => ({
            cardId,
          })),
        },
      },
      include: {
        deckcard: {
          include: {
            card: true,
          },
        },
      },
    })

    return deck
  }

  /**
   * Récupère tous les decks d'un utilisateur
   * Inclut les cartes associées à chaque deck.
   *
   * @param {number} userId - ID de l'utilisateur
   * @returns {Promise<Deck[]>} Promesse contenant le tableau des decks avec leurs cartes
   * @throws {Error} Erreur Prisma si problème lors de la requête
   *
   * @example
   * const decks = await decksService.getDecksByUserId(1);
   */

  async getDecksByUserId(userId: number) {
    const decks = await prisma.deck.findMany({
      where: { userId },
      include: {
        deckcard: {
          include: {
            card: true,
          },
        },
      },
    })
    return decks
  }

  /**
   * Récupère un deck spécifique par son ID et l'ID de son propriétaire
   * Inclut les cartes associées au deck.
   *
   * @param {number} deckId - ID du deck
   * @param {number} userId - ID de l'utilisateur propriétaire
   * @returns {Promise<Deck | null>} Promesse contenant le deck ou null s'il n'existe pas
   * @throws {Error} Erreur Prisma si problème lors de la requête
   *
   * @example
   * const deck = await decksService.getDeckById(1, 1);
   * if (!deck) {
   *   console.log("Deck non trouvé");
   * }
   */

  async getDeckById(deckId: number, userId: number) {
    const deck = await prisma.deck.findFirst({
      where: { id: deckId, userId },
      include: {
        deckcard: {
          include: {
            card: true,
          },
        },
      },
    })
    return deck
  }

  /**
   * Met à jour un deck existant
   * Permet de modifier le nom et/ou les cartes du deck.
   * Vérifie que l'utilisateur est bien le propriétaire.
   *
   * @param {number} deckId - ID du deck à mettre à jour
   * @param {number} userId - ID de l'utilisateur propriétaire
   * @param {string} [name] - Nouveau nom du deck (optionnel)
   * @param {number[]} [cards] - Nouveau tableau de 10 IDs de cartes (optionnel)
   * @returns {Promise<Deck | null>} Promesse contenant le deck mis à jour ou null si non trouvé/non autorisé
   * @throws {Error} Erreur Prisma si problème lors de la mise à jour
   *
   * @example
   * // Mettre à jour seulement le nom
   * const deck = await decksService.patchDeck(1, 1, "Nouveau nom");
   *
   * // Mettre à jour les cartes
   * const deck = await decksService.patchDeck(1, 1, undefined, [11,12,13,14,15,16,17,18,19,20]);
   */

  async patchDeck(
    deckId: number,
    userId: number,
    name?: string,
    cards?: number[],
  ) {
    const decks = await prisma.deck.findMany({
      include: {
        deckcard: {
          include: {
            card: true,
          },
        },
      },
    })
    const deck = decks.find((d) => d.id === deckId)
    if (!deck) {
      return null
    }
    if (deck.userId !== userId) {
      return null
    }
    const updatedDeck = await prisma.deck.update({
      where: { id: deckId },
      data: {
        name: name || deck.name,
        deckcard: cards
          ? {
              deleteMany: {},
              create: cards.map((cardId) => ({
                cardId,
              })),
            }
          : undefined,
      },
      include: {
        deckcard: {
          include: {
            card: true,
          },
        },
      },
    })
    return updatedDeck
  }

  /**
   * Supprime un deck et toutes ses associations de cartes
   * Vérifie que l'utilisateur est bien le propriétaire avant suppression.
   *
   * @param {number} deckId - ID du deck à supprimer
   * @param {number} userId - ID de l'utilisateur propriétaire
   * @returns {Promise<Deck | null>} Promesse contenant le deck supprimé ou null si non trouvé/non autorisé
   * @throws {Error} Erreur Prisma si problème lors de la suppression
   *
   * @example
   * const deletedDeck = await decksService.deleteDeck(1, 1);
   * if (!deletedDeck) {
   *   console.log("Deck non trouvé ou accès refusé");
   * }
   */

  async deleteDeck(deckId: number, userId: number) {
    const deck = await prisma.deck.findUnique({
      where: { id: deckId },
    })
    if (!deck) {
      return null
    }
    if (deck.userId !== userId) {
      return null
    }
    await prisma.deckCard.deleteMany({
      where: { deckId },
    })
    await prisma.deck.delete({
      where: { id: deckId },
    })
    return deck
  }
}
