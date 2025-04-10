export const SESSION_USER = (userId: string) => `SESSION_USER-${userId}`;

export const RP_SESSION_USER = (userId: string) => `RP_SESSION_USER-${userId}`;

export const REFRESH_TOKEN = (userId: string) => `REFRESH_TOKEN-${userId}`;

export const RP_TOKEN = (userId: string) => `RP_TOKEN-${userId}`;

export const NP_TOKEN = (userId: string) => `NP_TOKEN-${userId}`;

export const SIGN_UP_SESSION = (phoneNumber: string) =>
  `SIGN_UP_SESSION-${phoneNumber}`;

export const PASSWORD_SESSION = (phoneNumber: string) =>
  `PASSWORD_SESSION-${phoneNumber}`;
