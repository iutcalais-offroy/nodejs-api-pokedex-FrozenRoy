import { createServer } from 'http'
import { env } from './env'
import express from 'express'
import cors from 'cors'
import swaggerUi from 'swagger-ui-express'
import yaml from 'yamljs'
import path from 'path'
import { authRouter } from './route/auth.route'
import { cardsRouter } from './route/cards.route'
import { decksRouter } from './route/decks.route'
import { Server as SocketIOServer } from 'socket.io'
import {
  authenticateSocketToken,
  AuthenticatedSocket,
} from './middleware/auth.middleware'
import { matchmakingService } from './service/matchmaking.service'
import { CreateRoomParams, JoinRoomParams } from './types/matchmaking.types'
import { prisma } from './database'

// Create Express app
export const app = express()

// Middlewares
app.use(
  cors({
    origin: true, // Autorise toutes les origines
    credentials: true,
  }),
)

app.use(express.json())

// Serve static files (Socket.io test client)
app.use(express.static('public'))

// Swagger Documentation Setup
const swaggerConfig = yaml.load(path.join(__dirname, 'docs/swagger.config.yml'))
const authDoc = yaml.load(path.join(__dirname, 'docs/auth.doc.yml'))
const cardDoc = yaml.load(path.join(__dirname, 'docs/card.doc.yml'))
const deckDoc = yaml.load(path.join(__dirname, 'docs/deck.doc.yml'))

// Fusionner les documentations
const swaggerDocument = {
  ...swaggerConfig,
  paths: {
    ...authDoc.paths,
    ...cardDoc.paths,
    ...deckDoc.paths,
  },
}

// Configuration de Swagger UI
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Pokedex TCG API Documentation',
  }),
)

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'TCG Backend Server is running' })
})

app.use('/api/auth', authRouter)
app.use('/api/cards', cardsRouter)
app.use('/api/decks', decksRouter)

// Start server only if this file is run directly (not imported for tests)
if (require.main === module) {
  // Create HTTP server
  const httpServer = createServer(app)

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  })

  io.use(authenticateSocketToken)

  io.on('connection', (socket) => {
    const authenticatedSocket = socket as AuthenticatedSocket
    console.log(
      `User authenticated: ${authenticatedSocket.email} (ID: ${authenticatedSocket.userId}) - Socket ID: ${authenticatedSocket.id}`,
    )

    // Événement: createRoom - Créer une room d'attente
    authenticatedSocket.on(
      'createRoom',
      async (params: CreateRoomParams, callback) => {
        try {
          // Valider et convertir deckId en nombre
          const deckId = Number(params.deckId)
          if (isNaN(deckId)) {
            if (typeof callback === 'function') {
              callback({
                error: 'ID de deck invalide',
              })
            }
            return
          }

          // Récupérer les informations utilisateur depuis la base
          const user = await prisma.user.findUnique({
            where: { id: authenticatedSocket.userId },
          })

          if (!user) {
            if (typeof callback === 'function') {
              callback({
                error: 'Utilisateur non trouvé',
              })
            }
            return
          }

          // Créer la room
          const room = await matchmakingService.createRoom(
            authenticatedSocket.userId,
            user.username,
            user.email,
            authenticatedSocket.id,
            deckId,
          )

          // Rejoindre la room Socket.io
          authenticatedSocket.join(room.id)

          // Envoyer la confirmation au créateur
          if (typeof callback === 'function') {
            callback({
              success: true,
              room: {
                id: room.id,
                host: {
                  username: room.host.username,
                  userId: room.host.userId,
                },
                status: room.status,
                createdAt: room.createdAt,
              },
            })
          }

          // Broadcast la liste mise à jour à tous les clients
          io.emit('roomsListUpdated', {
            rooms: matchmakingService.getAvailableRooms(),
          })
        } catch (error) {
          console.error('Error creating room:', error)
          if (typeof callback === 'function') {
            callback({
              error: error instanceof Error ? error.message : 'Erreur inconnue',
            })
          }
        }
      },
    )

    // Événement: getRooms - Obtenir la liste des rooms disponibles
    authenticatedSocket.on('getRooms', (callback) => {
      try {
        const rooms = matchmakingService.getAvailableRooms()
        if (typeof callback === 'function') {
          callback({
            success: true,
            rooms,
          })
        }
      } catch (error) {
        console.error('Error getting rooms:', error)
        if (typeof callback === 'function') {
          callback({
            error: error instanceof Error ? error.message : 'Erreur inconnue',
          })
        }
      }
    })

    // Événement: joinRoom - Rejoindre une room et démarrer la partie
    authenticatedSocket.on(
      'joinRoom',
      async (params: JoinRoomParams, callback) => {
        try {
          const { roomId } = params

          // Valider et convertir deckId en nombre
          const deckId = Number(params.deckId)
          if (isNaN(deckId)) {
            if (typeof callback === 'function') {
              callback({
                error: 'ID de deck invalide',
              })
            }
            return
          }

          // Récupérer les informations utilisateur depuis la base
          const user = await prisma.user.findUnique({
            where: { id: authenticatedSocket.userId },
          })

          if (!user) {
            if (typeof callback === 'function') {
              callback({
                error: 'Utilisateur non trouvé',
              })
            }
            return
          }

          // Rejoindre la room et démarrer la partie
          const { hostGameState, guestGameState } =
            await matchmakingService.joinRoom(
              roomId,
              authenticatedSocket.userId,
              user.username,
              user.email,
              authenticatedSocket.id,
              deckId,
            )

          // Rejoindre la room Socket.io
          authenticatedSocket.join(roomId)

          // Récupérer la room pour avoir les sockets des joueurs
          const room = matchmakingService.getRoom(roomId)
          if (!room) {
            if (typeof callback === 'function') {
              callback({ error: "La room n'existe pas" })
            }
            return
          }

          // Envoyer l'état de jeu au host
          io.to(room.host.socketId).emit('gameStarted', hostGameState)

          // Envoyer l'état de jeu au guest
          io.to(room.guest!.socketId).emit('gameStarted', guestGameState)

          // Callback de succès
          if (typeof callback === 'function') {
            callback({
              success: true,
              message: 'Partie démarrée',
            })
          }

          // Broadcast la liste mise à jour (la room disparaît de la liste)
          io.emit('roomsListUpdated', {
            rooms: matchmakingService.getAvailableRooms(),
          })
        } catch (error) {
          console.error('Error joining room:', error)
          if (typeof callback === 'function') {
            callback({
              error: error instanceof Error ? error.message : 'Erreur inconnue',
            })
          }
        }
      },
    )

    authenticatedSocket.on('disconnect', () => {
      console.log(
        `User disconnected: ${authenticatedSocket.email} - Socket ID: ${authenticatedSocket.id}`,
      )

      // Supprimer le joueur des rooms et notifier
      matchmakingService.removePlayerFromRooms(authenticatedSocket.id)

      // Broadcast la liste mise à jour
      io.emit('roomsListUpdated', {
        rooms: matchmakingService.getAvailableRooms(),
      })
    })
  })

  try {
    httpServer.listen(env.PORT, () => {
      console.log(`\n🚀 Server is running on http://localhost:${env.PORT}`)
      console.log(
        `📚 API Documentation available at http://localhost:${env.PORT}/api-docs`,
      )
      console.log(
        `🧪 Socket.io Test Client available at http://localhost:${env.PORT}`,
      )
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}
