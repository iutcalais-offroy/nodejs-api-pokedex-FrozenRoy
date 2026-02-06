import { Request, Response } from 'express'
import { requestCards } from '../service/cards.service'

/**
 * Contrôleur pour la gestion des cartes Pokemon
 * Gère les requêtes HTTP liées aux cartes du jeu.
 */
export class CardsController {
  /**
   * Récupère toutes les cartes Pokemon triées par numéro Pokédex
   *
   * @route GET /api/cards
   * @access Public
   *
   * @param {Request} _req - Objet de requête Express (non utilisé)
   * @param {Response} res - Objet de réponse Express
   *
   * @returns {200} Liste des cartes - Retourne un tableau de toutes les cartes
   * @returns {500} Erreur serveur - Erreur lors de la récupération des cartes
   *
   * @example
   * // Réponse 200
   * [
   *   {
   *     "id": 1,
   *     "name": "Bulbasaur",
   *     "hp": 45,
   *     "attack": 49,
   *     "type": "Grass",
   *     "pokedexNumber": 1
   *   }
   * ]
   */

  async getCards(_req: Request, res: Response) {
    try {
      const cards = await requestCards.getCards()
      return res.status(200).json(cards)
    } catch (error) {
      console.error('Erreur lors de la récupération des cartes :', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }
}

export const cardsController = new CardsController()
