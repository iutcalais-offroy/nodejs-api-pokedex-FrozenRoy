import { Request, Response } from 'express'
import { DecksService } from '../service/decks.service'

const decksService = new DecksService()

/**
 * Contrôleur pour la gestion des decks de cartes
 * Gère les opérations CRUD sur les decks (collection de 10 cartes).
 */
export class DecksController {
  /**
   * Crée un nouveau deck pour l'utilisateur authentifié
   * Un deck doit contenir exactement 10 cartes valides.
   *
   * @route POST /api/decks
   * @access Privé (nécessite authentification JWT)
   *
   * @param {Request} req - Objet de requête Express
   * @param {string} req.body.name - Nom du deck
   * @param {number[]} req.body.cards - Tableau de 10 IDs de cartes
   * @param {number} req.userId - ID de l'utilisateur (ajouté par le middleware auth)
   * @param {Response} res - Objet de réponse Express
   *
   * @returns {201} Deck créé - Retourne le deck créé avec ses cartes
   * @returns {400} Données invalides - Nom manquant, nombre de cartes incorrect, ou IDs invalides
   * @returns {401} Non authentifié - Token manquant ou invalide
   * @returns {500} Erreur serveur - Erreur lors de la création
   *
   * @example
   * // Requête
   * POST /api/decks
   * Authorization: Bearer <token>
   * {
   *   "name": "Mon Deck Feu",
   *   "cards": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
   * }
   */
  async createDeck(req: Request, res: Response) {
    try {
      const { name, cards } = req.body

      // Vérifier que l'utilisateur est authentifié
      if (!req.userId) {
        return res.status(401).json({ error: 'Non authentifié' })
      }

      // Valider le nom
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Le nom du deck est requis' })
      }

      // Valider les cartes
      if (!cards || !Array.isArray(cards)) {
        return res
          .status(400)
          .json({ error: 'Les cartes doivent être un tableau' })
      }

      if (cards.length !== 10) {
        return res
          .status(400)
          .json({ error: 'Un deck doit contenir exactement 10 cartes' })
      }

      // Vérifier que tous les IDs sont des nombres valides
      const cardIds = cards.map((id) => parseInt(id))
      if (cardIds.some((id) => isNaN(id) || id <= 0)) {
        return res.status(400).json({
          error: 'Tous les IDs de cartes doivent être des nombres valides',
        })
      }

      // Créer le deck
      const deck = await decksService.createDeck(name, cardIds, req.userId)

      return res.status(201).json(deck)
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes("cartes n'existent pas") ||
          error.message.includes('exactement 10 cartes')
        ) {
          return res.status(400).json({ error: error.message })
        }
      }
      console.error('Erreur lors de la création du deck:', error)
      return res
        .status(500)
        .json({ error: 'Erreur serveur lors de la création du deck' })
    }
  }

  /**
   * Récupère tous les decks de l'utilisateur authentifié
   *
   * @route GET /api/decks/mine
   * @access Privé (nécessite authentification JWT)
   *
   * @param {Request} req - Objet de requête Express
   * @param {number} req.userId - ID de l'utilisateur (ajouté par le middleware auth)
   * @param {Response} res - Objet de réponse Express
   *
   * @returns {200} Liste des decks - Retourne tous les decks de l'utilisateur avec leurs cartes
   * @returns {401} Non authentifié - Token manquant ou invalide
   * @returns {500} Erreur serveur - Erreur lors de la récupération
   *
   * @example
   * // Réponse 200
   * [
   *   {
   *     "id": 1,
   *     "name": "Mon Deck Feu",
   *     "userId": 1,
   *     "deckcard": [...]
   *   }
   * ]
   */
  async getUserDecks(req: Request, res: Response) {
    try {
      // Vérifier que l'utilisateur est authentifié
      if (!req.userId) {
        return res.status(401).json({ error: 'Non authentifié' })
      }
      const decks = await decksService.getDecksByUserId(req.userId)
      if (decks.length === 0) {
        return res
          .status(200)
          .json({ message: 'Aucun deck trouvé pour cet utilisateur.' })
      } else {
        return res.status(200).json(decks)
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des decks:', error)
      return res
        .status(500)
        .json({ error: 'Erreur serveur lors de la récupération des decks' })
    }
  }

  /**
   * Récupère un deck spécifique par son ID
   * L'utilisateur doit être le propriétaire du deck.
   *
   * @route GET /api/decks/:id
   * @access Privé (nécessite authentification JWT)
   *
   * @param {Request} req - Objet de requête Express
   * @param {string} req.params.id - ID du deck
   * @param {number} req.userId - ID de l'utilisateur (ajouté par le middleware auth)
   * @param {Response} res - Objet de réponse Express
   *
   * @returns {200} Deck trouvé - Retourne le deck avec ses cartes
   * @returns {403} Accès refusé - Le deck appartient à un autre utilisateur
   * @returns {404} Deck introuvable - Aucun deck avec cet ID
   * @returns {500} Erreur serveur - Erreur lors de la récupération
   */
  async getDeckById(req: Request, res: Response) {
    try {
      const deckId = parseInt(req.params.id)
      const deck = await decksService.getDeckById(deckId, req.userId!)
      if (!deck) {
        return res.status(404).json({ error: 'Deck non trouvé' })
      } else if (deck.userId !== req.userId) {
        return res.status(403).json({ error: 'Accès refusé à ce deck' })
      } else {
        return res.status(200).json(deck)
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du deck:', error)
      return res
        .status(500)
        .json({ error: 'Erreur serveur lors de la récupération du deck' })
    }
  }

  /**
   * Met à jour un deck existant
   * Permet de modifier le nom et/ou les cartes du deck.
   * L'utilisateur doit être le propriétaire du deck.
   *
   * @route PATCH /api/decks/:id
   * @access Privé (nécessite authentification JWT)
   *
   * @param {Request} req - Objet de requête Express
   * @param {string} req.params.id - ID du deck
   * @param {string} [req.body.name] - Nouveau nom du deck (optionnel)
   * @param {number[]} [req.body.cards] - Nouveau tableau de 10 IDs de cartes (optionnel)
   * @param {number} req.userId - ID de l'utilisateur (ajouté par le middleware auth)
   * @param {Response} res - Objet de réponse Express
   *
   * @returns {200} Deck mis à jour - Retourne le deck modifié
   * @returns {400} Données invalides - Nombre de cartes incorrect ou cartes inexistantes
   * @returns {403} Accès refusé - Le deck appartient à un autre utilisateur
   * @returns {404} Deck introuvable - Aucun deck avec cet ID
   * @returns {500} Erreur serveur - Erreur lors de la mise à jour
   *
   * @example
   * // Requête
   * PATCH /api/decks/1
   * Authorization: Bearer <token>
   * {
   *   "name": "Nouveau nom",
   *   "cards": [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
   * }
   */
  async patchDeck(req: Request, res: Response): Promise<void> {
    try {
      const deckId = parseInt(req.params.id, 10)
      const { name, cards } = req.body
      const updatedDeck = await decksService.patchDeck(
        deckId,
        req.userId!,
        name,
        cards,
      )
      if (!updatedDeck) {
        res.status(404).json({ error: 'Deck inexistant' })
        return
      } else if (updatedDeck.userId !== req.userId) {
        res.status(403).json({ error: 'Accès refusé à ce deck' })
        return
      } else {
        res.status(200).json({
          message: 'Deck mis à jour avec succès',
          deck: updatedDeck,
        })
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'ERREUR_NB_CARTES') {
        res
          .status(400)
          .json({ error: 'Un deck doit contenir exactement 10 cartes' })
        return
      }
      if (
        error instanceof Error &&
        error.message === 'ERREUR_CARTES_INVALIDES'
      ) {
        res.status(400).json({ error: "Certaines cartes n'existent pas" })
        return
      }
      console.error('Erreur lors de la mise à jour du deck:', error)
      res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  /**
   * Supprime un deck existant
   * L'utilisateur doit être le propriétaire du deck.
   * Supprime également toutes les associations de cartes du deck.
   *
   * @route DELETE /api/decks/:id
   * @access Privé (nécessite authentification JWT)
   *
   * @param {Request} req - Objet de requête Express
   * @param {string} req.params.id - ID du deck
   * @param {number} req.userId - ID de l'utilisateur (ajouté par le middleware auth)
   * @param {Response} res - Objet de réponse Express
   *
   * @returns {200} Deck supprimé - Confirmation de la suppression
   * @returns {401} Non authentifié - Token manquant ou invalide
   * @returns {403} Accès refusé - Le deck appartient à un autre utilisateur
   * @returns {404} Deck introuvable - Aucun deck avec cet ID
   * @returns {500} Erreur serveur - Erreur lors de la suppression
   */
  async deleteDeck(req: Request, res: Response) {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Non authentifié' })
      }

      const deckId = parseInt(req.params.id, 10)
      const result = await decksService.deleteDeck(deckId, req.userId)
      if (!result) {
        return res.status(404).json({ error: 'Deck non trouvé' })
      } else if (result.userId !== req.userId) {
        return res.status(403).json({ error: 'Accès refusé à ce deck' })
      }
      return res.status(200).json({ message: 'Deck supprimé avec succès' })
    } catch (error) {
      console.error('Erreur lors de la suppression du deck:', error)
      return res
        .status(500)
        .json({ error: 'Erreur serveur lors de la suppression du deck' })
    }
  }
}
