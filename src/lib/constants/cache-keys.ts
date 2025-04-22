export const USER = (userId: string) => `session:user:${userId}`;

export const SESSION = (userId: string) => `session:${userId}`;

export const USER_2FA = (userId: string) => `session:user:2fa:${userId}`;

export const SESSION_2FA = (userId: string) => `session:2fa:${userId}`;

export const PASSWORD_SESSION = (phoneNumber: string) =>
  `session:password:${phoneNumber}`;

export const SIGN_UP_SESSION = (phoneNumber: string) =>
  `session:signup:${phoneNumber}`;
