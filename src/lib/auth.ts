import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'pathology-lab-default-jwt-secret-dev-2026';

export interface TokenPayload {
  userId: string;
  name: string;
  email: string;
  role: 'admin' | 'technician' | 'receptionist' | 'pathologist';
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAuthToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyAuthToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Extracts and verifies the current session user from cookies or Authorization header.
 */
export function getSessionUser(req: NextRequest): TokenPayload | null {
  // Check cookie first
  const cookieToken = req.cookies.get('lab_auth_token')?.value;
  if (cookieToken) {
    const payload = verifyAuthToken(cookieToken);
    if (payload) return payload;
  }

  // Check Authorization Bearer header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const headerToken = authHeader.substring(7);
    return verifyAuthToken(headerToken);
  }

  return null;
}
