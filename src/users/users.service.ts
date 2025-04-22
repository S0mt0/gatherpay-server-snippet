import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as QRCode from 'qrcode';

import { User } from './models/user.model';
import { AuthService } from './auth';
import { Session } from './auth/models';
import { CacheService } from 'src/lib/services';
import { SESSION, USER_2FA } from 'src/lib/constants';
import { decrypt, encrypt } from 'src/lib/utils';
import { CodeDto } from './auth/dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User) private userModel: typeof User,
    private readonly authService: AuthService,
    private readonly cacheService: CacheService,
  ) {}

  async enable2FA(session: Session) {
    const { qrCode, secret: temp_secret } =
      this.authService.generate2FASecret();

    await this.cacheService.set(
      USER_2FA(session.userId),
      temp_secret,
      this.authService.S_2FA_TTL,
    );

    const s_2fa = encrypt(session.userId);

    return {
      s_2fa,
      qrCodeImageUrl: await QRCode.toDataURL(qrCode),
      temp_secret,
    };
  }

  async verify2FA(s_2fa: string, dto: CodeDto, session: Session) {
    const decrypted = decrypt(s_2fa);

    const temp_secret = await this.cacheService.get<string>(
      USER_2FA(decrypted),
    );

    if (!temp_secret)
      throw new ForbiddenException('Session expired, please try again.');

    const isValidated = this.authService.verify2FAToken(temp_secret, dto.code);

    if (!isValidated) throw new ForbiddenException('Invalid code');

    session.twoFactorEnabled = true;
    session.twoFactorSecret = temp_secret;
    session.twoFactorLoggedIn = true;
    await session.save();

    await this.cacheService.delete(USER_2FA(decrypted));

    await this.cacheService.set(
      SESSION(session.id),
      session,
      this.authService.REFRESH_TOKEN_TTL,
    );

    return session;
  }

  findAll() {
    return this.userModel.findAll();
  }
}
