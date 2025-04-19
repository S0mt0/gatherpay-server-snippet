import { Global, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Twilio from 'twilio';

import {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_SERVICE_SID,
} from '../../constants';

@Global()
@Injectable()
export class TwilioService {
  private readonly client: Twilio.Twilio;
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly serviceSID: string;

  constructor(private configService: ConfigService) {
    this.accountSid = this.configService.get<string>(TWILIO_ACCOUNT_SID);
    this.authToken = this.configService.get<string>(TWILIO_AUTH_TOKEN);
    this.serviceSID = this.configService.get<string>(TWILIO_SERVICE_SID);

    this.client = Twilio(this.accountSid, this.authToken, {
      autoRetry: true,
      maxRetries: 3,
    });
  }

  async createVerifyCode(phoneNumber: string, channel: string = 'sms') {
    return await this.client.verify.v2
      .services(this.serviceSID)
      .verifications.create({
        to: phoneNumber,
        channel,
      });
  }

  async createVerificationCheck(phoneNumber: string, code: string) {
    return await this.client.verify.v2
      .services(this.serviceSID)
      .verificationChecks.create({
        to: phoneNumber,
        code,
      });
  }

  async sendMessage(phoneNumber: string, from: string = '+447949570728') {
    return await this.client.messages.create({
      from,
      body: 'Congratulations latif , weekly payments has been successfully scheduled',
      to: phoneNumber,
    });
  }
}
