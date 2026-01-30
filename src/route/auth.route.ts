import {Request, Response, Router} from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import {prisma} from '../database'

export const authRouter = Router()

// POST /auth/sign-up
// Accessible via POST /auth/sign-up

authRouter.post('/sign-up', async (req: Request, res: Response) => {
    const {email,username, password} = req.body

    try {

        if (!email || !username || !password) {
            return res.status(400).json({error: 'Email, username et mot de passe sont requis'})
        }

        const user = await prisma.user.findUnique({
            where: {email},
        })
    
        if (user) {
            return res.status(409).json({error: 'Un utilisateur avec cet email existe déjà'})
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const newUser = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
            },
        })

        const token = jwt.sign(
            {
                userId: newUser.id,
                email: newUser.email,
                username: newUser.username,
            },
            process.env.JWT_SECRET as string,
            {expiresIn: '7d'}, // Le token expire dans 7 jours
        )

        return res.status(201).json({
            message: 'Utilisateur créé avec succès',
            token,
            user: { 
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
            },
        })
    } catch (error) {
        console.error('Erreur lors de la connexion:', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})

authRouter.post('/sign-in', async (req: Request, res: Response) => {
    const {email, password} = req.body

    try {
        // 1. Vérifier que l'utilisateur existe
        const user = await prisma.user.findUnique({
            where: {email},
        })

        if (!user) {
            return res.status(401).json({error: 'Email ou mot de passe incorrect'})
        }

        // 2. Vérifier le mot de passe
        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return res.status(401).json({error: 'Email ou mot de passe incorrect'})
        }

        // 3. Générer le JWT
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
            },
            process.env.JWT_SECRET as string,
            {expiresIn: '7d'}, // Le token expire dans 7 jours
        )

        // 4. Retourner le token
        return res.status(200).json({
            message: 'Connexion réussie',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        })
    } catch (error) {
        console.error('Erreur lors de la connexion:', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})