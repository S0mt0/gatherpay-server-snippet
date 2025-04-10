import { Global, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import TwilioClient, { type Twilio } from 'twilio';

import {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_SERVICE_SID,
} from '../../constants';

@Global()
@Injectable()
export class TwilioService {
  private twilio: Twilio;
  accountSid: string;
  authToken: string;
  serviceSID: string;

  constructor(private configService: ConfigService) {
    this.accountSid = this.configService.get<string>(TWILIO_ACCOUNT_SID);
    this.authToken = this.configService.get<string>(TWILIO_AUTH_TOKEN);
    this.serviceSID = this.configService.get<string>(TWILIO_SERVICE_SID);

    if (!this.twilio) {
      this.twilio = TwilioClient(this.accountSid, this.authToken, {
        autoRetry: true,
        maxRetries: 3,
      });
    }
  }

  async createVerifyCode(phoneNumber: string, channel: string = 'sms') {
    return await this.twilio.verify.v2
      .services(this.serviceSID)
      .verifications.create({
        to: phoneNumber,
        channel,
      });
  }

  async createVerificationCheck(phoneNumber: string, code: string) {
    return await this.twilio.verify.v2
      .services(this.serviceSID)
      .verificationChecks.create({
        to: phoneNumber,
        code,
      });
  }
}
