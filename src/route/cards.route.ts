import { Router } from 'express'
import { cardsController } from '../controller/cards.controller'

/**
 * Router pour les routes des cartes Pokemon
 *
 * @route GET /api/cards - Récupère toutes les cartes
 */
export const cardsRouter = Router()

/**
 * Route pour récupérer toutes les cartes Pokemon
 *
 * @route GET /api/cards
 * @access Public
 * @see CardsController.getCards
 */
cardsRouter.get('/', cardsController.getCards)
