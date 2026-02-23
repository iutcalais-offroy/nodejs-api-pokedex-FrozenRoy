import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { Socket } from 'socket.io'
import { env } from '../env'

// Étendre le type Request pour ajouter userId
declare module 'express-serve-static-core' {
  interface Request {
    userId?: number
  }
}

// Étendre le type Socket pour ajouter les informations utilisateur
export interface AuthenticatedSocket extends Socket {
  userId: number
  email: string
}

/**
 * Middleware d'authentification JWT
 * Vérifie la présence et la validité d'un token JWT dans l'en-tête Authorization
 * et ajoute l'ID de l'utilisateur à la requête si le token est valide.
 *
 * @param {Request} req - Objet de requête Express
 * @param {Response} res - Objet de réponse Express
 * @param {NextFunction} next - Fonction middleware suivante
 * @returns {Response | void} Réponse JSON en cas d'erreur, ou appel du prochain middleware
 *
 * @throws {401} Si le token est manquant
 * @throws {401} Si le token est invalide ou expiré
 *
 * @example
 * // Utilisation dans une route
 * router.get('/protected', authenticateToken, (req, res) => {
 *   console.log(req.userId); // ID de l'utilisateur authentifié
 * });
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // 1. Récupérer le token depuis l'en-tête Authorization
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1] // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' })
  }

  try {
    // 2. Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: number
      email: string
    }

    // 3. Ajouter userId à la requête pour l'utiliser dans les routes
    req.userId = decoded.userId

    // 4. Passer au prochain middleware ou à la route
    return next()
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' })
  }
}

/**
 * Middleware d'authentification JWT pour Socket.io
 * Vérifie la présence et la validité d'un token JWT dans socket.handshake.auth.token
 * et ajoute les informations utilisateur (userId, email) au socket si le token est valide.
 *
 * @param {Socket} socket - Socket Socket.io
 * @param {Function} next - Fonction middleware suivante
 * @returns {void} Appel de next() avec ou sans erreur
 *
 * @throws {Error} Si le token est manquant
 * @throws {Error} Si le token est invalide ou expiré
 *
 * @example
 * // Utilisation avec Socket.io
 * io.use(authenticateSocketToken);
 *
 * io.on('connection', (socket: AuthenticatedSocket) => {
 *   console.log(socket.userId); // ID de l'utilisateur authentifié
 *   console.log(socket.email); // Email de l'utilisateur authentifié
 * });
 */
export const authenticateSocketToken = (
  socket: Socket,
  next: (err?: Error) => void,
) => {
  // 1. Récupérer le token depuis socket.handshake.auth
  const token = socket.handshake.auth.token

  if (!token) {
    return next(new Error('Token manquant'))
  }

  try {
    // 2. Vérifier et décoder le token
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      userId: number
      email: string
    }

    // 3. Ajouter les informations utilisateur au socket
    const authenticatedSocket = socket as AuthenticatedSocket
    authenticatedSocket.userId = decoded.userId
    authenticatedSocket.email = decoded.email

    // 4. Passer au prochain middleware
    next()
  } catch {
    return next(new Error('Token invalide ou expiré'))
  }
}
