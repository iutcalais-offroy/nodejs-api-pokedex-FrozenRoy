import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { prismaMock } from './vitest.setup'
import { matchmakingService } from '../src/service/matchmaking.service'
import type { Deck, DeckCard, Card, User } from '../src/generated/prisma/client'

describe('Matchmaking Service', () => {
  let user1Id: number
  let user2Id: number
  let user1Username: string
  let user2Username: string
  let user1Email: string
  let user2Email: string
  let deck1Id: number
  let deck2Id: number

  // Types helper pour les mocks
  type DeckWithRelations = Deck & {
    deckcard: (DeckCard & { card: Card })[]
    user: User
  }

  // Helper pour créer des cartes mock
  const createMockCards = (start: number, count: number): Card[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: start + i,
      name: `Card ${start + i}`,
      hp: 100,
      attack: 50,
      type: 'Fire',
      pokedexNumber: start + i,
      imgUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  }

  // Helper pour créer un deck mock
  const createMockDeck = (
    deckId: number,
    userId: number,
    username: string,
    email: string,
    cardCount: number,
    cardStart: number = 1,
  ): DeckWithRelations => {
    const cards = createMockCards(cardStart, cardCount)
    return {
      id: deckId,
      name: `Deck ${deckId}`,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      deckcard: cards.map((card, i) => ({
        id: cardStart + i,
        deckId,
        cardId: card.id,
        card,
      })),
      user: {
        id: userId,
        username,
        email,
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }
  }

  beforeAll(async () => {
    // Générer des noms uniques basés sur le timestamp
    const timestamp = Date.now()
    user1Username = `matchmaking_user1_${timestamp}`
    user1Email = `matchmaking1_${timestamp}@test.com`
    user2Username = `matchmaking_user2_${timestamp}`
    user2Email = `matchmaking2_${timestamp}@test.com`

    // Utiliser des IDs fixes pour les tests
    user1Id = 1
    user2Id = 2
    deck1Id = 1
    deck2Id = 2
  })

  afterAll(async () => {
    // Aucune cleanup nécessaire car on utilise des mocks
  })

  beforeEach(() => {
    // Réinitialiser les rooms avant chaque test
    matchmakingService['rooms'].clear()
  })

  describe('createRoom', () => {
    it('should create a room with a valid deck', async () => {
      // Mock un deck valide avec 10 cartes pour user1
      const mockDeck = createMockDeck(
        deck1Id,
        user1Id,
        user1Username,
        user1Email,
        10,
        1,
      )
      prismaMock.deck.findFirst.mockResolvedValue(mockDeck)

      const room = await matchmakingService.createRoom(
        user1Id,
        user1Username,
        user1Email,
        'socket-1',
        deck1Id,
      )

      expect(room).toBeDefined()
      expect(room.host.userId).toBe(user1Id)
      expect(room.host.username).toBe(user1Username)
      expect(room.host.deckId).toBe(deck1Id)
      expect(room.status).toBe('waiting')
      expect(room.guest).toBeNull()
    })

    it('should throw error if deck does not belong to user', async () => {
      // Mock retourne null car le deck n'appartient pas à l'utilisateur
      prismaMock.deck.findFirst.mockResolvedValue(null)

      await expect(
        matchmakingService.createRoom(
          user1Id,
          user1Username,
          user1Email,
          'socket-1',
          deck2Id, // deck2 appartient à user2
        ),
      ).rejects.toThrow("n'existe pas ou ne vous appartient pas")
    })

    it('should throw error if deck is invalid (not 10 cards)', async () => {
      // Mock un deck invalide avec seulement 5 cartes
      const mockInvalidDeck = createMockDeck(
        999,
        user1Id,
        user1Username,
        user1Email,
        5,
        1,
      )
      prismaMock.deck.findFirst.mockResolvedValue(mockInvalidDeck)

      await expect(
        matchmakingService.createRoom(
          user1Id,
          user1Username,
          user1Email,
          'socket-1',
          999, // ID du deck invalide mocké
        ),
      ).rejects.toThrow('doit contenir exactement 10 cartes')
    })
  })

  describe('getAvailableRooms', () => {
    it('should return list of available rooms', async () => {
      // Mock un deck valide pour créer la room
      const mockDeck = createMockDeck(
        deck1Id,
        user1Id,
        user1Username,
        user1Email,
        10,
        1,
      )
      prismaMock.deck.findFirst.mockResolvedValue(mockDeck)

      await matchmakingService.createRoom(
        user1Id,
        user1Username,
        user1Email,
        'socket-1',
        deck1Id,
      )

      const rooms = matchmakingService.getAvailableRooms()

      expect(rooms).toBeDefined()
      expect(rooms.length).toBe(1)
      expect(rooms[0].host.userId).toBe(user1Id)
      expect(rooms[0].status).toBe('waiting')
    })

    it('should not list rooms that are in progress', async () => {
      // Mock pour le deck du host
      const mockDeck1 = createMockDeck(
        deck1Id,
        user1Id,
        user1Username,
        user1Email,
        10,
        1,
      )
      prismaMock.deck.findFirst.mockResolvedValueOnce(mockDeck1)

      const room = await matchmakingService.createRoom(
        user1Id,
        user1Username,
        user1Email,
        'socket-1',
        deck1Id,
      )

      // Mock pour le deck du guest
      const mockDeck2 = createMockDeck(
        deck2Id,
        user2Id,
        user2Username,
        user2Email,
        10,
        11,
      )
      prismaMock.deck.findFirst.mockResolvedValueOnce(mockDeck2)

      // Mock pour récupérer le deck du host avec ses cartes
      prismaMock.deck.findFirst.mockResolvedValueOnce(mockDeck1)

      // Rejoindre la room
      await matchmakingService.joinRoom(
        room.id,
        user2Id,
        user2Username,
        user2Email,
        'socket-2',
        deck2Id,
      )

      const rooms = matchmakingService.getAvailableRooms()

      expect(rooms.length).toBe(0) // La room ne doit plus être disponible
    })

    it('should return empty list when no rooms exist', () => {
      const rooms = matchmakingService.getAvailableRooms()

      expect(rooms).toBeDefined()
      expect(rooms.length).toBe(0)
    })
  })

  describe('joinRoom', () => {
    it('should join a room and start the game', async () => {
      // Mock pour le deck du host
      const mockDeck1 = createMockDeck(
        deck1Id,
        user1Id,
        user1Username,
        user1Email,
        10,
        1,
      )
      prismaMock.deck.findFirst.mockResolvedValueOnce(mockDeck1)

      const room = await matchmakingService.createRoom(
        user1Id,
        user1Username,
        user1Email,
        'socket-1',
        deck1Id,
      )

      // Mock pour le deck du guest
      const mockDeck2 = createMockDeck(
        deck2Id,
        user2Id,
        user2Username,
        user2Email,
        10,
        11,
      )
      prismaMock.deck.findFirst.mockResolvedValueOnce(mockDeck2)

      // Mock pour récupérer le deck du host avec ses cartes
      prismaMock.deck.findFirst.mockResolvedValueOnce(mockDeck1)

      const { hostGameState, guestGameState } =
        await matchmakingService.joinRoom(
          room.id,
          user2Id,
          user2Username,
          user2Email,
          'socket-2',
          deck2Id,
        )

      // Vérifier l'état du host
      expect(hostGameState.roomId).toBe(room.id)
      expect(hostGameState.player.userId).toBe(user1Id)
      expect(hostGameState.player.username).toBe(user1Username)
      expect(hostGameState.player.hand.length).toBe(5)
      expect(hostGameState.opponent.userId).toBe(user2Id)
      expect(hostGameState.opponent.username).toBe(user2Username)
      expect(hostGameState.opponent.hand.length).toBe(0) // Ne voit pas les cartes de l'adversaire
      expect(hostGameState.opponent.handSize).toBe(5)

      // Vérifier l'état du guest
      expect(guestGameState.roomId).toBe(room.id)
      expect(guestGameState.player.userId).toBe(user2Id)
      expect(guestGameState.player.username).toBe(user2Username)
      expect(guestGameState.player.hand.length).toBe(5)
      expect(guestGameState.opponent.userId).toBe(user1Id)
      expect(guestGameState.opponent.username).toBe(user1Username)
      expect(guestGameState.opponent.hand.length).toBe(0)
      expect(guestGameState.opponent.handSize).toBe(5)

      // Vérifier que la room est maintenant 'ready'
      const updatedRoom = matchmakingService.getRoom(room.id)
      expect(updatedRoom?.status).toBe('ready')
      expect(updatedRoom?.guest).not.toBeNull()
    })

    it('should throw error if room does not exist', async () => {
      // Mock retourne null car le deck existe mais pas besoin de vérification ici
      prismaMock.deck.findFirst.mockResolvedValue(null)

      await expect(
        matchmakingService.joinRoom(
          'invalid-room-id',
          user2Id,
          user2Username,
          user2Email,
          'socket-2',
          deck2Id,
        ),
      ).rejects.toThrow("n'existe pas")
    })

    it('should throw error if room is already full', async () => {
      // Mock pour le deck du host
      const mockDeck1 = createMockDeck(
        deck1Id,
        user1Id,
        user1Username,
        user1Email,
        10,
        1,
      )
      prismaMock.deck.findFirst.mockResolvedValueOnce(mockDeck1)

      const room = await matchmakingService.createRoom(
        user1Id,
        user1Username,
        user1Email,
        'socket-1',
        deck1Id,
      )

      // Mock pour le deck du guest
      const mockDeck2 = createMockDeck(
        deck2Id,
        user2Id,
        user2Username,
        user2Email,
        10,
        11,
      )
      prismaMock.deck.findFirst.mockResolvedValueOnce(mockDeck2)

      // Mock pour récupérer le deck du host avec ses cartes
      prismaMock.deck.findFirst.mockResolvedValueOnce(mockDeck1)

      // Premier joueur rejoint
      await matchmakingService.joinRoom(
        room.id,
        user2Id,
        user2Username,
        user2Email,
        'socket-2',
        deck2Id,
      )

      // Mock pour un troisième deck (pas nécessaire car l'erreur arrivera avant)
      prismaMock.deck.findFirst.mockResolvedValue(null)

      // Un troisième utilisateur tente de rejoindre (devrait échouer)
      await expect(
        matchmakingService.joinRoom(
          room.id,
          999, // user3 id
          'matchmaking_user3',
          'matchmaking3@test.com',
          'socket-3',
          999, // deck3 id
        ),
      ).rejects.toThrow('complète')
    })

    it('should throw error if deck does not belong to user', async () => {
      // Mock pour le deck du host
      const mockDeck1 = createMockDeck(
        deck1Id,
        user1Id,
        user1Username,
        user1Email,
        10,
        1,
      )
      prismaMock.deck.findFirst.mockResolvedValueOnce(mockDeck1)

      const room = await matchmakingService.createRoom(
        user1Id,
        user1Username,
        user1Email,
        'socket-1',
        deck1Id,
      )

      // Mock retourne null car le deck n'appartient pas à l'utilisateur
      prismaMock.deck.findFirst.mockResolvedValue(null)

      await expect(
        matchmakingService.joinRoom(
          room.id,
          user2Id,
          user2Username,
          user2Email,
          'socket-2',
          deck1Id, // deck1 appartient à user1, pas user2
        ),
      ).rejects.toThrow("n'existe pas ou ne vous appartient pas")
    })
  })

  describe('getRoom', () => {
    it('should return a room when it exists', async () => {
      // Mock pour le deck du host
      const mockDeck1 = createMockDeck(
        deck1Id,
        user1Id,
        user1Username,
        user1Email,
        10,
        1,
      )
      prismaMock.deck.findFirst.mockResolvedValueOnce(mockDeck1)

      const room = await matchmakingService.createRoom(
        user1Id,
        user1Username,
        user1Email,
        'socket-1',
        deck1Id,
      )

      const foundRoom = matchmakingService.getRoom(room.id)

      expect(foundRoom).toBeDefined()
      expect(foundRoom?.id).toBe(room.id)
      expect(foundRoom?.status).toBe('waiting')
    })

    it('should return undefined when room does not exist', () => {
      const foundRoom = matchmakingService.getRoom('non-existent-room-id')

      expect(foundRoom).toBeUndefined()
    })
  })

  describe('deleteRoom', () => {
    it('should delete a room', async () => {
      // Mock pour le deck du host
      const mockDeck1 = createMockDeck(
        deck1Id,
        user1Id,
        user1Username,
        user1Email,
        10,
        1,
      )
      prismaMock.deck.findFirst.mockResolvedValueOnce(mockDeck1)

      const room = await matchmakingService.createRoom(
        user1Id,
        user1Username,
        user1Email,
        'socket-1',
        deck1Id,
      )

      matchmakingService.deleteRoom(room.id)

      const foundRoom = matchmakingService.getRoom(room.id)
      expect(foundRoom).toBeUndefined()
    })

    it('should not throw error when deleting a non-existent room', () => {
      expect(() =>
        matchmakingService.deleteRoom('non-existent-room-id'),
      ).not.toThrow()
    })
  })

  describe('cleanupOldRooms', () => {
    it('should remove rooms older than 10 minutes', async () => {
      // Mock pour le deck du host
      const mockDeck1 = createMockDeck(
        deck1Id,
        user1Id,
        user1Username,
        user1Email,
        10,
        1,
      )
      prismaMock.deck.findFirst.mockResolvedValueOnce(mockDeck1)

      const room = await matchmakingService.createRoom(
        user1Id,
        user1Username,
        user1Email,
        'socket-1',
        deck1Id,
      )

      // Modifier la date de création pour simuler une vieille room (11 minutes)
      room.createdAt = new Date(Date.now() - 11 * 60 * 1000)

      matchmakingService.cleanupOldRooms()

      const foundRoom = matchmakingService.getRoom(room.id)
      expect(foundRoom).toBeUndefined()
    })

    it('should keep rooms younger than 10 minutes', async () => {
      // Mock pour le deck du host
      const mockDeck1 = createMockDeck(
        deck1Id,
        user1Id,
        user1Username,
        user1Email,
        10,
        1,
      )
      prismaMock.deck.findFirst.mockResolvedValueOnce(mockDeck1)

      const room = await matchmakingService.createRoom(
        user1Id,
        user1Username,
        user1Email,
        'socket-1',
        deck1Id,
      )

      // Modifier la date de création pour simuler une room récente (5 minutes)
      room.createdAt = new Date(Date.now() - 5 * 60 * 1000)

      matchmakingService.cleanupOldRooms()

      const foundRoom = matchmakingService.getRoom(room.id)
      expect(foundRoom).toBeDefined()
    })

    it('should only remove waiting rooms, not ready rooms', async () => {
      // Mock pour le deck du host
      const mockDeck1 = createMockDeck(
        deck1Id,
        user1Id,
        user1Username,
        user1Email,
        10,
        1,
      )
      prismaMock.deck.findFirst.mockResolvedValueOnce(mockDeck1)

      const room = await matchmakingService.createRoom(
        user1Id,
        user1Username,
        user1Email,
        'socket-1',
        deck1Id,
      )

      // Modifier la date de création et le statut
      room.createdAt = new Date(Date.now() - 11 * 60 * 1000)
      room.status = 'ready'

      matchmakingService.cleanupOldRooms()

      const foundRoom = matchmakingService.getRoom(room.id)
      expect(foundRoom).toBeDefined() // La room ne devrait pas être supprimée car elle est 'ready'
    })
  })

  describe('removePlayerFromRooms', () => {
    it('should remove rooms when host disconnects', async () => {
      // Mock pour le deck du host
      const mockDeck1 = createMockDeck(
        deck1Id,
        user1Id,
        user1Username,
        user1Email,
        10,
        1,
      )
      prismaMock.deck.findFirst.mockResolvedValueOnce(mockDeck1)

      const room = await matchmakingService.createRoom(
        user1Id,
        user1Username,
        user1Email,
        'socket-1',
        deck1Id,
      )

      matchmakingService.removePlayerFromRooms('socket-1')

      const rooms = matchmakingService.getAvailableRooms()
      expect(rooms.length).toBe(0)

      const removedRoom = matchmakingService.getRoom(room.id)
      expect(removedRoom).toBeUndefined()
    })

    it('should remove rooms when guest disconnects', async () => {
      // Mock pour le deck du host
      const mockDeck1 = createMockDeck(
        deck1Id,
        user1Id,
        user1Username,
        user1Email,
        10,
        1,
      )
      prismaMock.deck.findFirst.mockResolvedValueOnce(mockDeck1)

      const room = await matchmakingService.createRoom(
        user1Id,
        user1Username,
        user1Email,
        'socket-1',
        deck1Id,
      )

      // Mock pour le deck du guest
      const mockDeck2 = createMockDeck(
        deck2Id,
        user2Id,
        user2Username,
        user2Email,
        10,
        11,
      )
      prismaMock.deck.findFirst.mockResolvedValueOnce(mockDeck2)

      // Mock pour récupérer le deck du host avec ses cartes
      prismaMock.deck.findFirst.mockResolvedValueOnce(mockDeck1)

      await matchmakingService.joinRoom(
        room.id,
        user2Id,
        user2Username,
        user2Email,
        'socket-2',
        deck2Id,
      )

      matchmakingService.removePlayerFromRooms('socket-2')

      const removedRoom = matchmakingService.getRoom(room.id)
      expect(removedRoom).toBeUndefined()
    })

    it('should not throw error when socket ID is not in any room', () => {
      expect(() =>
        matchmakingService.removePlayerFromRooms('non-existent-socket-id'),
      ).not.toThrow()
    })
  })
})
