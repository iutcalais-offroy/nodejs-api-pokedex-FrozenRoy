import { Router } from 'express'
import { DecksController } from '../controller/decks.controller'
import { authenticateToken } from '../middleware/auth.middleware'

const router = Router()
const decksController = new DecksController()

/**
 * Router pour les routes des decks de cartes
 * Toutes les routes nécessitent une authentification JWT.
 *
 * @route POST /api/decks - Crée un nouveau deck
 * @route GET /api/decks/mine - Récupère les decks de l'utilisateur
 * @route GET /api/decks/:id - Récupère un deck par ID
 * @route PATCH /api/decks/:id - Met à jour un deck
 * @route DELETE /api/decks/:id - Supprime un deck
 */

/**
 * Route pour créer un nouveau deck
 * @route POST /api/decks
 * @access Privé
 * @see DecksController.createDeck
 */

router.post('/', authenticateToken, (req, res) =>
  decksController.createDeck(req, res),
)

/**
 * Route pour récupérer tous les decks de l'utilisateur
 * @route GET /api/decks/mine
 * @access Privé
 * @see DecksController.getUserDecks
 */

router.get('/mine', authenticateToken, (req, res) =>
  decksController.getUserDecks(req, res),
)

/**
 * Route pour récupérer un deck spécifique par ID
 * @route GET /api/decks/:id
 * @access Privé
 * @see DecksController.getDeckById
 */

router.get('/:id', authenticateToken, (req, res) =>
  decksController.getDeckById(req, res),
)

/**
 * Route pour mettre à jour un deck
 * @route PATCH /api/decks/:id
 * @access Privé
 * @see DecksController.patchDeck
 */

router.patch('/:id', authenticateToken, (req, res) =>
  decksController.patchDeck(req, res),
)

/**
 * Route pour supprimer un deck
 * @route DELETE /api/decks/:id
 * @access Privé
 * @see DecksController.deleteDeck
 */

router.delete('/:id', authenticateToken, (req, res) =>
  decksController.deleteDeck(req, res),
)

export { router as decksRouter }
