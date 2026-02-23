import { prisma } from '../database'
import {
  Room,
  Player,
  RoomInfo,
  GameState,
  GameCard,
} from '../types/matchmaking.types'
import { v4 as uuidv4 } from 'uuid'

/**
 * Service de gestion du matchmaking et des rooms de jeu
 * Gère les rooms en mémoire et les opérations de matchmaking
 */
export class MatchmakingService {
  private rooms: Map<string, Room> = new Map()

  /**
   * Crée une nouvelle room d'attente
   * @param userId - ID de l'utilisateur créateur
   * @param username - Nom d'utilisateur
   * @param email - Email de l'utilisateur
   * @param socketId - ID du socket
   * @param deckId - ID du deck à utiliser
   * @returns La room créée
   * @throws {Error} Si le deck n'appartient pas à l'utilisateur ou est invalide
   */
  async createRoom(
    userId: number,
    username: string,
    email: string,
    socketId: string,
    deckId: number,
  ): Promise<Room> {
    // Vérifier que le deck appartient à l'utilisateur et contient exactement 10 cartes
    console.log(
      `[Matchmaking] Checking deck ${deckId} for user ${userId} (${username})`,
    )

    const deck = await prisma.deck.findFirst({
      where: {
        id: deckId,
        userId: userId,
      },
      include: {
        deckcard: {
          include: {
            card: true,
          },
        },
        user: true,
      },
    })

    if (!deck) {
      console.log(
        `[Matchmaking] Deck not found: deckId=${deckId}, userId=${userId}`,
      )
      throw new Error("Le deck n'existe pas ou ne vous appartient pas")
    }

    console.log(
      `[Matchmaking] Deck found: ${deck.name} with ${deck.deckcard.length} cards`,
    )

    if (deck.deckcard.length !== 10) {
      throw new Error('Le deck doit contenir exactement 10 cartes')
    }

    // Créer le joueur host
    const host: Player = {
      userId,
      username,
      email,
      socketId,
      deckId,
    }

    // Créer la room
    const roomId = uuidv4()
    const room: Room = {
      id: roomId,
      host,
      guest: null,
      status: 'waiting',
      createdAt: new Date(),
    }

    this.rooms.set(roomId, room)
    return room
  }

  /**
   * Récupère la liste des rooms disponibles (en attente)
   * @returns Liste des rooms en attente d'un second joueur
   */
  getAvailableRooms(): RoomInfo[] {
    const availableRooms: RoomInfo[] = []

    this.rooms.forEach((room) => {
      if (room.status === 'waiting') {
        availableRooms.push({
          id: room.id,
          host: {
            username: room.host.username,
            userId: room.host.userId,
          },
          status: room.status,
          createdAt: room.createdAt,
        })
      }
    })

    return availableRooms
  }

  /**
   * Permet à un joueur de rejoindre une room et démarre la partie
   * @param roomId - ID de la room à rejoindre
   * @param userId - ID de l'utilisateur
   * @param username - Nom d'utilisateur
   * @param email - Email de l'utilisateur
   * @param socketId - ID du socket
   * @param deckId - ID du deck à utiliser
   * @returns Les états de jeu pour les deux joueurs
   * @throws {Error} Si la room n'existe pas, est complète, ou si le deck est invalide
   */
  async joinRoom(
    roomId: string,
    userId: number,
    username: string,
    email: string,
    socketId: string,
    deckId: number,
  ): Promise<{ hostGameState: GameState; guestGameState: GameState }> {
    const room = this.rooms.get(roomId)

    if (!room) {
      throw new Error("La room n'existe pas")
    }

    if (room.status !== 'waiting') {
      throw new Error('La room est déjà complète')
    }

    // Vérifier que le deck appartient à l'utilisateur et contient exactement 10 cartes
    const deck = await prisma.deck.findFirst({
      where: {
        id: deckId,
        userId: userId,
      },
      include: {
        deckcard: {
          include: {
            card: true,
          },
        },
        user: true,
      },
    })

    if (!deck) {
      throw new Error("Le deck n'existe pas ou ne vous appartient pas")
    }

    if (deck.deckcard.length !== 10) {
      throw new Error('Le deck doit contenir exactement 10 cartes')
    }

    // Créer le joueur guest
    const guest: Player = {
      userId,
      username,
      email,
      socketId,
      deckId,
    }

    // Mettre à jour la room
    room.guest = guest
    room.status = 'ready'

    // Récupérer les decks des deux joueurs
    const hostDeck = await prisma.deck.findFirst({
      where: { id: room.host.deckId },
      include: {
        deckcard: {
          include: {
            card: true,
          },
        },
        user: true,
      },
    })

    if (!hostDeck) {
      throw new Error('Erreur lors de la récupération du deck du host')
    }

    // Mélanger les cartes et distribuer 5 cartes à chaque joueur
    const hostCards = this.shuffleArray(hostDeck.deckcard.map((dc) => dc.card))
    const guestCards = this.shuffleArray(deck.deckcard.map((dc) => dc.card))

    const hostHand = hostCards.slice(0, 5).map(this.mapCardToGameCard)
    const guestHand = guestCards.slice(0, 5).map(this.mapCardToGameCard)

    // Créer les états de jeu
    const hostGameState: GameState = {
      roomId: room.id,
      player: {
        userId: room.host.userId,
        username: room.host.username,
        hand: hostHand,
      },
      opponent: {
        userId: guest.userId,
        username: guest.username,
        hand: [], // L'opponent ne voit pas les cartes
        handSize: guestHand.length,
      },
    }

    const guestGameState: GameState = {
      roomId: room.id,
      player: {
        userId: guest.userId,
        username: guest.username,
        hand: guestHand,
      },
      opponent: {
        userId: room.host.userId,
        username: room.host.username,
        hand: [], // L'opponent ne voit pas les cartes
        handSize: hostHand.length,
      },
    }

    return { hostGameState, guestGameState }
  }

  /**
   * Récupère une room par son ID
   * @param roomId - ID de la room
   * @returns La room ou undefined si elle n'existe pas
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId)
  }

  /**
   * Supprime une room
   * @param roomId - ID de la room à supprimer
   */
  deleteRoom(roomId: string): void {
    this.rooms.delete(roomId)
  }

  /**
   * Nettoie les rooms qui attendent depuis trop longtemps (plus de 10 minutes)
   */
  cleanupOldRooms(): void {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)

    this.rooms.forEach((room, roomId) => {
      if (room.status === 'waiting' && room.createdAt < tenMinutesAgo) {
        this.rooms.delete(roomId)
      }
    })
  }

  /**
   * Trouve et supprime une room par socket ID
   * @param socketId - ID du socket
   */
  removePlayerFromRooms(socketId: string): void {
    this.rooms.forEach((room, roomId) => {
      if (
        room.host.socketId === socketId ||
        room.guest?.socketId === socketId
      ) {
        this.rooms.delete(roomId)
      }
    })
  }

  /**
   * Mélange un tableau (algorithme Fisher-Yates)
   * @param array - Tableau à mélanger
   * @returns Tableau mélangé
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  /**
   * Convertit une carte Prisma en GameCard
   * @param card - Carte Prisma
   * @returns GameCard
   */
  private mapCardToGameCard(card: {
    id: number
    name: string
    hp: number
    attack: number
    type: string
    pokedexNumber: number
    imgUrl: string | null
  }): GameCard {
    return {
      id: card.id,
      name: card.name,
      hp: card.hp,
      attack: card.attack,
      type: card.type,
      pokedexNumber: card.pokedexNumber,
      imgUrl: card.imgUrl,
    }
  }
}

// Instance singleton du service
export const matchmakingService = new MatchmakingService()
