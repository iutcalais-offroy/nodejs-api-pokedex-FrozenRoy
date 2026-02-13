import { describe, expect, it, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../src/index'
import { prismaMock } from './vitest.setup'
import jwt from 'jsonwebtoken'

describe('Decks Endpoints', () => {
  let token: string

  beforeEach(() => {
    // Créer un token valide pour les tests
    token = jwt.sign(
      { userId: 1, email: 'test@example.com' },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' },
    )
  })

  // Mock Deck for tests
  const mockDeck = {
    id: 10,
    name: 'My Deck',
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  // Test for create a new deck with the required 10 cards
  it('POST /api/decks should create a deck with 10 cards', async () => {
    const mockCards = Array(10).fill({
      id: 1,
      name: 'Pikachu',
      hp: 35,
      attack: 55,
      type: 'Electric' as const,
      pokedexNumber: 25,
      imgUrl: 'pikachu.png',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    prismaMock.card.findMany.mockResolvedValue(mockCards)
    prismaMock.deck.create.mockResolvedValue(mockDeck)

    const res = await request(app)
      .post('/api/decks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'My Deck',
        cards: [454, 455, 456, 457, 458, 459, 460, 461, 462, 463],
      })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('My Deck')
  })

  it('POST /api/decks should return 400 if not 10 cards', async () => {
    const res = await request(app)
      .post('/api/decks')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'My Deck', cards: [1, 2, 3] })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('POST /api/decks should return 400 if some cards do not exist', async () => {
    // Mock seulement 5 cartes trouvées au lieu de 10
    const mockCards = Array(5).fill({
      id: 1,
      name: 'Pikachu',
      hp: 35,
      attack: 55,
      type: 'Electric' as const,
      pokedexNumber: 25,
      imgUrl: 'pikachu.png',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    prismaMock.card.findMany.mockResolvedValue(mockCards)

    const res = await request(app)
      .post('/api/decks')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'My Deck', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('POST /api/decks should return 401 without token', async () => {
    const res = await request(app)
      .post('/api/decks')
      .send({ name: 'My Deck', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })

    expect(res.status).toBe(401)
  })

  // Test for retrieving the current user's decks
  it('GET /api/decks/mine should return user decks', async () => {
    prismaMock.deck.findMany.mockResolvedValue([mockDeck])

    const res = await request(app)
      .get('/api/decks/mine')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body[0].userId).toBe(1)
  })

  it('GET /api/decks/mine should return 401 without token', async () => {
    const res = await request(app).get('/api/decks/mine')

    expect(res.status).toBe(401)
  })

  it('GET /api/decks/mine should return empty array message for user with no decks', async () => {
    prismaMock.deck.findMany.mockResolvedValue([])

    const res = await request(app)
      .get('/api/decks/mine')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('message')
  })

  it('GET /api/decks/mine should return 500 on server error', async () => {
    prismaMock.deck.findMany.mockRejectedValue(new Error('DB Error'))

    const res = await request(app)
      .get('/api/decks/mine')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(500)
  })

  // Test for deleting a specific deck by its ID
  it('DELETE /api/decks/:id should delete if owner', async () => {
    prismaMock.deck.findUnique.mockResolvedValue(mockDeck)
    prismaMock.deck.delete.mockResolvedValue(mockDeck)

    const res = await request(app)
      .delete('/api/decks/10')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('message')
  })

  it('DELETE /api/decks/:id should return 401 without token', async () => {
    const res = await request(app).delete('/api/decks/10')

    expect(res.status).toBe(401)
  })

  it('GET /api/decks/:id should return deck by id', async () => {
    prismaMock.deck.findFirst.mockResolvedValue(mockDeck)

    const res = await request(app)
      .get('/api/decks/10')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe(10)
  })

  it('GET /api/decks/:id should return 404 for non-existent deck', async () => {
    prismaMock.deck.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .get('/api/decks/999')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })

  it('GET /api/decks/:id should return 403 for deck owned by another user', async () => {
    const otherUserDeck = { ...mockDeck, userId: 2 }
    prismaMock.deck.findFirst.mockResolvedValue(otherUserDeck)

    const res = await request(app)
      .get('/api/decks/10')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
  })

  it('GET /api/decks/:id should return 500 on server error', async () => {
    prismaMock.deck.findFirst.mockRejectedValue(new Error('DB Error'))

    const res = await request(app)
      .get('/api/decks/10')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(500)
  })

  it('PATCH /api/decks/:id should update deck', async () => {
    const updatedDeck = { ...mockDeck, name: 'Updated Deck' }
    const mockCards = Array(10).fill({
      id: 1,
      name: 'Pikachu',
      hp: 35,
      attack: 55,
      type: 'Electric' as const,
      pokedexNumber: 25,
      imgUrl: 'pikachu.png',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    prismaMock.deck.findMany.mockResolvedValue([mockDeck])
    prismaMock.card.findMany.mockResolvedValue(mockCards)
    prismaMock.deck.update.mockResolvedValue(updatedDeck)

    const res = await request(app)
      .patch('/api/decks/10')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Deck', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('message')
  })

  it('PATCH /api/decks/:id should return 404 for non-existent deck', async () => {
    prismaMock.deck.findMany.mockResolvedValue([])

    const res = await request(app)
      .patch('/api/decks/999')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated' })

    expect(res.status).toBe(404)
  })

  it('PATCH /api/decks/:id should return 404 for deck owned by another user', async () => {
    const otherUserDeck = { ...mockDeck, userId: 2 }
    prismaMock.deck.findMany.mockResolvedValue([otherUserDeck])

    const res = await request(app)
      .patch('/api/decks/10')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated' })

    expect(res.status).toBe(404)
  })

  it('PATCH /api/decks/:id should return 500 on server error', async () => {
    prismaMock.deck.findMany.mockRejectedValue(new Error('DB Error'))

    const res = await request(app)
      .patch('/api/decks/10')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated' })

    expect(res.status).toBe(500)
  })
})
