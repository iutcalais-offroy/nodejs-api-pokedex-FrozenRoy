import { Request, Response } from "express";
import { DecksService } from "../service/decks.service";

const decksService = new DecksService();

export class DecksController {
    async createDeck(req: Request, res: Response) {
        try {
            const { name, cards } = req.body;

            // Vérifier que l'utilisateur est authentifié
            if (!req.userId) {
                return res.status(401).json({ error: "Non authentifié" });
            }

            // Valider le nom
            if (!name || typeof name !== 'string' || name.trim() === '') {
                return res.status(400).json({ error: "Le nom du deck est requis" });
            }

            // Valider les cartes
            if (!cards || !Array.isArray(cards)) {
                return res.status(400).json({ error: "Les cartes doivent être un tableau" });
            }

            if (cards.length !== 10) {
                return res.status(400).json({ error: "Un deck doit contenir exactement 10 cartes" });
            }

            // Vérifier que tous les IDs sont des nombres valides
            const cardIds = cards.map(id => parseInt(id));
            if (cardIds.some(id => isNaN(id) || id <= 0)) {
                return res.status(400).json({ error: "Tous les IDs de cartes doivent être des nombres valides" });
            }

            // Créer le deck
            const deck = await decksService.createDeck(name, cardIds, req.userId);

            return res.status(201).json(deck);
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes("cartes n'existent pas") || error.message.includes("exactement 10 cartes")) {
                    return res.status(400).json({ error: error.message });
                }
            }
            console.error("Erreur lors de la création du deck:", error);
            return res.status(500).json({ error: "Erreur serveur lors de la création du deck" });
        }
    }

    async getUserDecks(req: Request, res: Response) {
        try {
            // Vérifier que l'utilisateur est authentifié
            if (!req.userId) {
                return res.status(401).json({ error: "Non authentifié" });
            }
            const decks = await decksService.getDecksByUserId(req.userId);
            if (decks.length === 0) {
                return res.status(200).json({ message: "Aucun deck trouvé pour cet utilisateur." });
            }else {
                return res.status(200).json(decks);
            }
        } catch (error) {
            console.error("Erreur lors de la récupération des decks:", error);
            return res.status(500).json({ error: "Erreur serveur lors de la récupération des decks" });
        }
    }

    async getDeckById(req: Request, res: Response) {
        try {
            const deckId = parseInt(req.params.id);        
            const deck = await decksService.getDeckById(deckId, req.userId!);
            if (!deck) {
                return res.status(404).json({ error: "Deck non trouvé" });
            } else if (deck.userId !== req.userId) {
                return res.status(403).json({ error: "Accès refusé à ce deck" });
            } else {
                return res.status(200).json(deck);
            }
        } catch (error) {
            console.error("Erreur lors de la récupération du deck:", error);
            return res.status(500).json({ error: "Erreur serveur lors de la récupération du deck" });
        }
    }

    async patchDeck(req: Request, res: Response): Promise<void> {
        try {
            const deckId = parseInt(req.params.id, 10)
            const {name, cards} = req.body
            const updatedDeck = await decksService.patchDeck(deckId, req.userId!, name, cards)
            if (!updatedDeck) {
                res.status(404).json({error: 'Deck inexistant'})
                return
            } else if (updatedDeck.userId !== req.userId) {
                res.status(403).json({error: 'Accès refusé à ce deck'})
                return
            } else {
                res.status(200).json({
                    message: 'Deck mis à jour avec succès',
                    deck: updatedDeck,
                })
            }
        } catch (error) {
            if (error instanceof Error && error.message === 'ERREUR_NB_CARTES') {
                res.status(400).json({error: 'Un deck doit contenir exactement 10 cartes'})
                return
            }
            if (error instanceof Error && error.message === 'ERREUR_CARTES_INVALIDES') {
                res.status(400).json({error: 'Certaines cartes n\'existent pas'})
                return
            }
            console.error('Erreur lors de la mise à jour du deck:', error)
            res.status(500).json({error: 'Erreur serveur'})
        }
    }

    async deleteDeck(req: Request, res: Response) {
        try {
            if (!req.userId) {
                return res.status(401).json({ error: "Non authentifié" });
            }

            const deckId = parseInt(req.params.id, 10);
            const result = await decksService.deleteDeck(deckId, req.userId);
            if (!result) {
                return res.status(404).json({ error: "Deck non trouvé" });
            }
            else if (result.userId !== req.userId) {
                return res.status(403).json({ error: "Accès refusé à ce deck" });
            }
            return res.status(200).json({ message: "Deck supprimé avec succès" });
        } catch (error) {
            console.error("Erreur lors de la suppression du deck:", error);
            return res.status(500).json({ error: "Erreur serveur lors de la suppression du deck" });
        }
    }
    }
    