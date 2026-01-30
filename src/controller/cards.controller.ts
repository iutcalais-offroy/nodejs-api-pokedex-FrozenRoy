import {Request, Response} from 'express'
import {requestCards} from '../service/cards.service'

export class CardsController {
    async getCards(_req: Request, res: Response) {
    try {
        const cards = await requestCards.getCards()
        return res.status(200).json(cards)
    } catch (error) {
        console.error('Erreur lors de la récupération des cartes :', error)
        return res.status(500).json({error: 'Erreur serveur'})
    } 
    }
}

export const cardsController = new CardsController();