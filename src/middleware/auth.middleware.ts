import {NextFunction, Request, Response} from 'express'
import jwt from 'jsonwebtoken'

// Étendre le type Request pour ajouter userId
declare global {
    namespace Express {
        interface Request {
            userId?: number
        }
    }
}

export const authenticateToken = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    // 1. Récupérer le token depuis l'en-tête Authorization
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Format: "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({error: 'Token manquant'})
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
        return res.status(401).json({error: 'Token invalide ou expiré'})
    }
}