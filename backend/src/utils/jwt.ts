import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

export interface TokenPayload {
  userId: string
  email: string
  role: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: string
}

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions)
}

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions)
}

export const generateTokens = (payload: TokenPayload): AuthTokens => {
  const accessToken = generateAccessToken(payload)
  const refreshToken = generateRefreshToken(payload)
  
  return {
    accessToken,
    refreshToken,
    expiresIn: JWT_EXPIRES_IN
  }
}

export const verifyToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch (error) {
    throw new Error('Invalid token')
  }
}

export const decodeToken = (token: string): TokenPayload | null => {
  try {
    return jwt.decode(token) as TokenPayload
  } catch (error) {
    return null
  }
}