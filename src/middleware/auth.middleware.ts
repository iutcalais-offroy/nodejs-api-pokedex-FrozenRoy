import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

// Étendre le type Request pour ajouter userId
declare global {
  namespace Express {
    interface Request {
      userId?: number
    }
  }
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
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide ou expiré' })
  }
}
