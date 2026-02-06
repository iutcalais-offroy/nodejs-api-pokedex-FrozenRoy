import { prisma } from '../database'

/**
 * Service pour la gestion des cartes Pokemon
 * Gère la logique métier liée aux cartes du jeu.
 */
export class RequestCards {
  /**
   * Récupère toutes les cartes de la base de données
   * Les cartes sont triées par ordre croissant de numéro Pokédex.
   *
   * @returns {Promise<Card[]>} Promesse contenant le tableau de toutes les cartes
   * @throws {Error} Si une erreur survient lors de la requête à la base de données
   *
   * @example
   * const cards = await requestCards.getCards();
   * // Retourne: [{ id: 1, name: "Bulbasaur", pokedexNumber: 1, ... }, ...]
   */

  async getCards() {
    const cards = await prisma.card.findMany({
      orderBy: { pokedexNumber: 'asc' },
    })
    return cards
  }
}

export const requestCards = new RequestCards()
