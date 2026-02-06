import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../src/index'
import { prismaMock } from './vitest.setup'

describe('Cards Endpoints', () => {
  // Test for the success case: retrieving the list of cards
  it('GET /api/cards should return all cards sorted by pokedexNumber', async () => {
    const mockCards = [
      {
        id: 1,
        name: 'Bulbasaur',
        pokedexNumber: 1,
        hp: 45,
        attack: 49,
        type: 'Grass' as const,
        imgUrl: 'bulbasaur.png',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        name: 'Charmander',
        pokedexNumber: 4,
        hp: 39,
        attack: 52,
        type: 'Fire' as const,
        imgUrl: 'charmander.png',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    prismaMock.card.findMany.mockResolvedValue(mockCards)
    const res = await request(app).get('/api/cards')

    // Check if the response status is 200
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].pokedexNumber).toBe(1)
  })

  // Test for the failure case: handling a database error
  it('should return 500 on server error', async () => {
    prismaMock.card.findMany.mockRejectedValue(new Error('DB Error'))
    const res = await request(app).get('/api/cards')
    expect(res.status).toBe(500)
  })
})
