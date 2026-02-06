import { prisma } from "../database";

export class DecksService {

    async createDeck(name: string, cardIds: number[], userId: number) {
        // Vérifier que le deck contient exactement 10 cartes
        if (cardIds.length !== 10) {
            throw new Error("Un deck doit contenir exactement 10 cartes");
        }

        // Vérifier que toutes les cartes existent
        const cards = await prisma.card.findMany({
            where: {
                id: { in: cardIds }
            }
        });

        if (cards.length !== 10) {
            throw new Error("Certaines cartes n'existent pas");
        }

        // Créer le deck avec les cartes associées
        const deck = await prisma.deck.create({
            data: {
                name,
                userId,
                deckcard: {
                    create: cardIds.map(cardId => ({
                        cardId
                    }))
                }
            },
            include: {
                deckcard: {
                    include: {
                        card: true
                    }
                }
            }
        });

        return deck;
    }

    async getDecksByUserId(userId: number) {
        const decks = await prisma.deck.findMany({
            where: { userId },
            include: {
                deckcard: {
                    include: { 
                        card: true
                    }
                }
            }
        });
        return decks;
    }

    async getDeckById(deckId: number, userId: number) {
        const deck = await prisma.deck.findFirst({
            where: { id: deckId, userId },
            include: {
                deckcard: {
                    include: {
                        card: true
                    }
                }
            }
        });
        return deck;
    }

    async patchDeck(deckId: number, userId: number, name?: string, cards?: number[]) {
        const decks = await prisma.deck.findMany({
            include: { 
                deckcard: {
                    include: {
                        card: true
                    }
                }
            }
        });
        const deck = decks.find(d => d.id === deckId); 
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
                deckcard: cards ? {
                    deleteMany: {},
                    create: cards.map(cardId => ({
                        cardId
                    }))
                } : undefined
            },
            include: {
                deckcard: {
                    include: {
                        card: true
                    }
                }
                }
        });
        return updatedDeck;
    }

    async deleteDeck(deckId: number, userId: number) {
        const deck = await prisma.deck.findUnique({
            where: { id: deckId , userId}
        });
        if (!deck) {
            return null
        }
        await prisma.deckCard.deleteMany({
            where: { deckId }
        });
        await prisma.deck.delete({
            where: { id: deckId }
        });
        return deck;
    }
    
}