import { prisma } from "../database";

export class RequestCards {
    async getCards() {
        const cards = await prisma.card.findMany({
            orderBy: { pokedexNumber: 'asc' },
        });
        return cards;
    }
}

export const requestCards = new RequestCards();