import { describe, expect, it, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { prismaMock } from './vitest.setup'
import { app } from '../src/index'
import bcrypt from 'bcrypt'

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn(),
  },
}))

describe('POST /api/auth/sign-up', () => {
  beforeEach(() => {
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
  })
  it('should create a new user', async () => {
    const newUser = {
      id: 1,
      username: 'Charlie',
      createdAt: new Date(),
      updatedAt: new Date(),
      email: 'charlie@example.com',
      password: 'hashedpassword',
    }

    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockResolvedValue(newUser)

    const response = await request(app).post('/api/auth/sign-up').send({
      username: 'Charlie',
      email: 'charlie@example.com',
      password: 'password123',
    })

    expect(response.status).toBe(201)
    expect(response.body).toHaveProperty(
      'message',
      'Utilisateur créé avec succès',
    )
    expect(response.body.user).toHaveProperty('username', 'Charlie')
    expect(response.body).toHaveProperty('token')
  })

  it('should return 409 if email already exists', async () => {
    const existingUser = {
      id: 1,
      username: 'Existing',
      createdAt: new Date(),
      updatedAt: new Date(),
      email: 'existing@example.com',
      password: 'hashedpassword',
    }

    prismaMock.user.findUnique.mockResolvedValue(existingUser)

    const response = await request(app).post('/api/auth/sign-up').send({
      username: 'Charlie',
      email: 'existing@example.com',
      password: 'password123',
    })

    expect(response.status).toBe(409)
    expect(response.body).toHaveProperty(
      'error',
      'Un utilisateur avec cet email existe déjà',
    )
  })

  it('should return 400 for missing fields', async () => {
    const response = await request(app)
      .post('/api/auth/sign-up')
      .send({ username: 'Charlie' })

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty('error')
  })

  it('should return 500 on server error during sign-up', async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error('DB Error'))

    const response = await request(app).post('/api/auth/sign-up').send({
      username: 'Charlie',
      email: 'test@example.com',
      password: 'password123',
    })

    expect(response.status).toBe(500)
    expect(response.body).toHaveProperty('error', 'Erreur serveur')
  })
})

describe('POST /api/auth/sign-in', () => {
  it('should sign in existing user with valid credentials', async () => {
    const existingUser = {
      id: 1,
      username: 'Charlie',
      createdAt: new Date(),
      updatedAt: new Date(),
      email: 'charlie@example.com',
      password: 'hashed_password',
    }

    prismaMock.user.findUnique.mockResolvedValue(existingUser)

    const response = await request(app)
      .post('/api/auth/sign-in')
      .send({ email: 'charlie@example.com', password: 'password123' })

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('message', 'Connexion réussie')
    expect(response.body).toHaveProperty('token')
    expect(response.body.user).toHaveProperty('email', 'charlie@example.com')
  })

  it('should return 401 for non-existent user', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)

    const response = await request(app)
      .post('/api/auth/sign-in')
      .send({ email: 'nonexistent@example.com', password: 'password123' })

    expect(response.status).toBe(401)
    expect(response.body).toHaveProperty(
      'error',
      'Email ou mot de passe incorrect',
    )
  })

  it('should return 401 for invalid password', async () => {
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never)

    const existingUser = {
      id: 1,
      username: 'Charlie',
      createdAt: new Date(),
      updatedAt: new Date(),
      email: 'charlie@example.com',
      password: 'hashed_password',
    }

    prismaMock.user.findUnique.mockResolvedValue(existingUser)

    const response = await request(app)
      .post('/api/auth/sign-in')
      .send({ email: 'charlie@example.com', password: 'wrongpassword' })

    expect(response.status).toBe(401)
    expect(response.body).toHaveProperty(
      'error',
      'Email ou mot de passe incorrect',
    )
  })

  it('should return 500 on server error during sign-in', async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error('DB Error'))

    const response = await request(app)
      .post('/api/auth/sign-in')
      .send({ email: 'test@example.com', password: 'password123' })

    expect(response.status).toBe(500)
    expect(response.body).toHaveProperty('error', 'Erreur serveur')
  })
})
