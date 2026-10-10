import type { AuthSession } from "@atlas/api";

export const ANA: AuthSession = {
  tokens: { accessToken: "access-1", accessTokenExpiresAt: "2026-10-05T00:15:00Z", refreshToken: "refresh-1" },
  user: { id: "u1", email: "ana@example.com", name: "Ana Reyes", role: "buyer" },
};
