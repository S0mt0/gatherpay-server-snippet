export const USER_SESSION = (userId: string) => `session:user:${userId}`;

export const PASSWORD_SESSION = (phoneNumber: string) =>
  `session:password:${phoneNumber}`;

export const SIGN_UP_SESSION = (phoneNumber: string) =>
  `session:signup:${phoneNumber}`;
