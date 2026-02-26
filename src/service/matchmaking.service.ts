import { prisma } from '../database'
import {
  Room,
  Player,
  RoomInfo,
  GameState,
  GameCard,
  GameData,
  ActiveCard,
} from '../types/matchmaking.types'
import { v4 as uuidv4 } from 'uuid'
import { calculateDamage } from '../utils/rules.util'
import { PokemonType } from '../generated/prisma/client'

/**
 * Service de gestion du matchmaking et des rooms de jeu
 * Gère les rooms en mémoire et les opérations de matchmaking
 */
export class MatchmakingService {
  private rooms: Map<string, Room> = new Map()
  private games: Map<string, GameData> = new Map() // État des parties en cours

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
    const hostDeckRemaining = hostCards.slice(5).map(this.mapCardToGameCard)
    const guestDeckRemaining = guestCards.slice(5).map(this.mapCardToGameCard)

    // Créer l'état de la partie
    const gameData: GameData = {
      roomId: room.id,
      hostSocketId: room.host.socketId,
      guestSocketId: guest.socketId,
      hostUserId: room.host.userId,
      guestUserId: guest.userId,
      hostUsername: room.host.username,
      guestUsername: guest.username,
      hostHand,
      guestHand,
      hostDeck: hostDeckRemaining,
      guestDeck: guestDeckRemaining,
      hostActiveCard: null,
      guestActiveCard: null,
      hostScore: 0,
      guestScore: 0,
      currentPlayerSocketId: room.host.socketId, // Le créateur commence
      status: 'playing',
    }

    // Stocker l'état de la partie
    this.games.set(room.id, gameData)

    // Mettre à jour le statut de la room
    room.status = 'playing'

    // Créer les états de jeu pour chaque joueur
    const hostGameState = this.createGameStateForPlayer(
      gameData,
      room.host.socketId,
    )
    const guestGameState = this.createGameStateForPlayer(
      gameData,
      guest.socketId,
    )

    return { hostGameState, guestGameState }
  }

  /**
   * Crée un état de jeu personnalisé pour un joueur spécifique
   * Cache les informations sensibles de l'adversaire (main, deck)
   */
  private createGameStateForPlayer(
    gameData: GameData,
    socketId: string,
  ): GameState {
    const isHost = socketId === gameData.hostSocketId

    const playerState = {
      userId: isHost ? gameData.hostUserId : gameData.guestUserId,
      username: isHost ? gameData.hostUsername : gameData.guestUsername,
      hand: isHost ? gameData.hostHand : gameData.guestHand,
      deckSize: isHost ? gameData.hostDeck.length : gameData.guestDeck.length,
      activeCard: isHost ? gameData.hostActiveCard : gameData.guestActiveCard,
      score: isHost ? gameData.hostScore : gameData.guestScore,
    }

    const opponentState = {
      userId: isHost ? gameData.guestUserId : gameData.hostUserId,
      username: isHost ? gameData.guestUsername : gameData.hostUsername,
      hand: [], // On ne montre jamais la main de l'adversaire
      handSize: isHost ? gameData.guestHand.length : gameData.hostHand.length,
      deckSize: isHost ? gameData.guestDeck.length : gameData.hostDeck.length,
      activeCard: isHost ? gameData.guestActiveCard : gameData.hostActiveCard,
      score: isHost ? gameData.guestScore : gameData.hostScore,
    }

    return {
      roomId: gameData.roomId,
      player: playerState,
      opponent: opponentState,
      currentPlayerSocketId: gameData.currentPlayerSocketId,
      isMyTurn: socketId === gameData.currentPlayerSocketId,
    }
  }

  /**
   * Piocher des cartes jusqu'à avoir 5 cartes en main
   * Les joueurs peuvent piocher à tout moment (pas de vérification de tour)
   * @param roomId - ID de la room
   * @param socketId - ID du socket du joueur
   * @returns Les états de jeu mis à jour pour les deux joueurs
   */
  drawCards(roomId: string, socketId: string): GameState[] {
    const gameData = this.games.get(roomId)
    if (!gameData) {
      throw new Error("La partie n'existe pas")
    }

    const isHost = socketId === gameData.hostSocketId

    // Piocher jusqu'à 5 cartes maximum
    if (isHost) {
      const cardsToDraw = Math.min(
        5 - gameData.hostHand.length,
        gameData.hostDeck.length,
      )
      const drawnCards = gameData.hostDeck.splice(0, cardsToDraw)
      gameData.hostHand.push(...drawnCards)
    } else {
      const cardsToDraw = Math.min(
        5 - gameData.guestHand.length,
        gameData.guestDeck.length,
      )
      const drawnCards = gameData.guestDeck.splice(0, cardsToDraw)
      gameData.guestHand.push(...drawnCards)
    }

    // Créer les états de jeu pour les deux joueurs
    return [
      this.createGameStateForPlayer(gameData, gameData.hostSocketId),
      this.createGameStateForPlayer(gameData, gameData.guestSocketId),
    ]
  }

  /**
   * Jouer une carte de sa main sur le terrain
   * Les joueurs peuvent jouer des cartes à tout moment (pas de vérification de tour)
   * @param roomId - ID de la room
   * @param socketId - ID du socket du joueur
   * @param cardIndex - Index de la carte dans la main
   * @returns Les états de jeu mis à jour pour les deux joueurs
   * @throws {Error} Si l'index est invalide
   */
  playCard(roomId: string, socketId: string, cardIndex: number): GameState[] {
    const gameData = this.games.get(roomId)
    if (!gameData) {
      throw new Error("La partie n'existe pas")
    }

    const isHost = socketId === gameData.hostSocketId
    const hand = isHost ? gameData.hostHand : gameData.guestHand

    // Vérifier l'index
    if (cardIndex < 0 || cardIndex >= hand.length) {
      throw new Error('Index de carte invalide')
    }

    // Retirer la carte de la main et la mettre sur le terrain
    const card = hand.splice(cardIndex, 1)[0]
    const activeCard: ActiveCard = {
      ...card,
      currentHp: card.hp,
    }

    if (isHost) {
      gameData.hostActiveCard = activeCard
    } else {
      gameData.guestActiveCard = activeCard
    }

    // Créer les états de jeu pour les deux joueurs
    return [
      this.createGameStateForPlayer(gameData, gameData.hostSocketId),
      this.createGameStateForPlayer(gameData, gameData.guestSocketId),
    ]
  }

  /**
   * Attaquer la carte adverse avec sa carte active
   * @param roomId - ID de la room
   * @param socketId - ID du socket du joueur
   * @returns Les états de jeu mis à jour ou le résultat de fin de partie
   * @throws {Error} Si les conditions d'attaque ne sont pas remplies
   */
  attack(
    roomId: string,
    socketId: string,
  ): {
    states: GameState[]
    gameEnded: boolean
    winner?: { socketId: string; username: string }
  } {
    const gameData = this.games.get(roomId)
    if (!gameData) {
      throw new Error("La partie n'existe pas")
    }

    // Vérifier que c'est le tour du joueur
    if (gameData.currentPlayerSocketId !== socketId) {
      throw new Error("Ce n'est pas votre tour")
    }

    const isHost = socketId === gameData.hostSocketId

    // Vérifier que les deux joueurs ont une carte active
    if (!gameData.hostActiveCard || !gameData.guestActiveCard) {
      throw new Error('Les deux joueurs doivent avoir une carte active')
    }

    // Récupérer les cartes
    const attackerCard = isHost
      ? gameData.hostActiveCard
      : gameData.guestActiveCard
    const defenderCard = isHost
      ? gameData.guestActiveCard
      : gameData.hostActiveCard

    // Calculer les dégâts
    const damage = calculateDamage(
      attackerCard.attack,
      attackerCard.type as PokemonType,
      defenderCard.type as PokemonType,
    )

    // Appliquer les dégâts
    defenderCard.currentHp -= damage

    // Vérifier si la carte adverse est KO
    if (defenderCard.currentHp <= 0) {
      // Augmenter le score de l'attaquant
      if (isHost) {
        gameData.hostScore++
      } else {
        gameData.guestScore++
      }

      // Retirer la carte KO du terrain
      if (isHost) {
        gameData.guestActiveCard = null
      } else {
        gameData.hostActiveCard = null
      }
    }

    // Changer de tour après l'attaque
    gameData.currentPlayerSocketId = isHost
      ? gameData.guestSocketId
      : gameData.hostSocketId

    // Vérifier la victoire (premier à 3 points)
    const gameEnded = gameData.hostScore >= 3 || gameData.guestScore >= 3

    if (gameEnded) {
      gameData.status = 'finished'
      const winnerIsHost = gameData.hostScore >= 3
      return {
        states: [
          this.createGameStateForPlayer(gameData, gameData.hostSocketId),
          this.createGameStateForPlayer(gameData, gameData.guestSocketId),
        ],
        gameEnded: true,
        winner: {
          socketId: winnerIsHost
            ? gameData.hostSocketId
            : gameData.guestSocketId,
          username: winnerIsHost
            ? gameData.hostUsername
            : gameData.guestUsername,
        },
      }
    }

    // Créer les états de jeu pour les deux joueurs
    return {
      states: [
        this.createGameStateForPlayer(gameData, gameData.hostSocketId),
        this.createGameStateForPlayer(gameData, gameData.guestSocketId),
      ],
      gameEnded: false,
    }
  }

  /**
   * Terminer son tour et passer au joueur suivant
   * @param roomId - ID de la room
   * @param socketId - ID du socket du joueur
   * @returns Les états de jeu mis à jour pour les deux joueurs
   * @throws {Error} Si ce n'est pas le tour du joueur
   */
  endTurn(roomId: string, socketId: string): GameState[] {
    const gameData = this.games.get(roomId)
    if (!gameData) {
      throw new Error("La partie n'existe pas")
    }

    // Vérifier que c'est le tour du joueur
    if (gameData.currentPlayerSocketId !== socketId) {
      throw new Error("Ce n'est pas votre tour")
    }

    const isHost = socketId === gameData.hostSocketId

    // Changer de tour
    gameData.currentPlayerSocketId = isHost
      ? gameData.guestSocketId
      : gameData.hostSocketId

    // Créer les états de jeu pour les deux joueurs
    return [
      this.createGameStateForPlayer(gameData, gameData.hostSocketId),
      this.createGameStateForPlayer(gameData, gameData.guestSocketId),
    ]
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
        this.games.delete(roomId) // Supprimer aussi la partie en cours
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
