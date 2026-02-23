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

    authenticatedSocket.on('disconnect', () => {
      console.log(
        `User disconnected: ${authenticatedSocket.email} - Socket ID: ${authenticatedSocket.id}`,
      )
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
