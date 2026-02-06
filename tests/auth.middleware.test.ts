import { describe, expect, it, vi } from 'vitest';
import { authenticateToken } from '../src/middleware/auth.middleware';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

describe('Auth Middleware', () => {
    vi.unmock('../src/middleware/auth.middleware');

    it('should return 401 if no token is provided', () => {
        const req = { headers: {} } as Partial<Request> as Request;
        
        const jsonMock = vi.fn();
        const res = {
            status: vi.fn().mockReturnThis(),
            json: jsonMock
        } as unknown as Response;
        
        const next = vi.fn() as NextFunction;

        // Call the middleware
        authenticateToken(req, res, next);

        // Expectations
        expect(res.status).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'Token manquant' });
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', () => {
        const req = {
            headers: { authorization: 'Bearer invalid_token' }
        } as Partial<Request> as Request;
        
        const jsonMock = vi.fn();
        const res = {
            status: vi.fn().mockReturnThis(),
            json: jsonMock
        } as unknown as Response;
        
        const next = vi.fn() as NextFunction;

        authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'Token invalide ou expiré' });
        expect(next).not.toHaveBeenCalled();
    });

    it('should call next() if token is valid', () => {
        const token = jwt.sign(
            { userId: 1, email: 'test@example.com' },
            process.env.JWT_SECRET as string,
            { expiresIn: '1h' }
        );

        const req = {
            headers: { authorization: `Bearer ${token}` }
        } as Partial<Request> as Request;
        
        const jsonMock = vi.fn();
        const res = {
            status: vi.fn().mockReturnThis(),
            json: jsonMock
        } as unknown as Response;
        
        const next = vi.fn() as NextFunction;

        authenticateToken(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.userId).toBe(1);
        expect(res.status).not.toHaveBeenCalled();
    });
});