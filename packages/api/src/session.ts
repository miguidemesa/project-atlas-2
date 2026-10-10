/** The signed-in person, as the auth endpoints return them. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
}

/** What /api/auth/login, /register and /refresh return inside { data }. */
export interface AuthSession {
  tokens: AuthTokens;
  user: AuthUser;
}
