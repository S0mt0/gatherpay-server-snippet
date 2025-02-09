/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string) {
    const user = await this.usersService.findOne(email);

    if (!user || user.password !== pass)
      throw new UnauthorizedException('Invalid credentials');

    const { password, ...result } = user;
    return result;
  }

  async login(user: Record<string, any>) {
    const payload = { email: user.email, sub: user.userId };
    return {
      access_token: this.jwtService.signAsync(payload),
      user,
    };
  }
}
