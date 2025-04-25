import { ForbiddenException, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import * as admin from 'firebase-admin';

import {
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
  FIREBASE_PROJECT_ID,
  SUPPORTED_PROVIDERS,
} from '../constants';
import { AllowedProviders } from '../interface';
import { User } from 'src/users/models';

@Injectable()
export class FirebaseService implements OnModuleInit {
  constructor(
    private readonly config: ConfigService,
    @InjectModel(User) private userModel: typeof User,
  ) {}

  onModuleInit() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: this.config.get(FIREBASE_PROJECT_ID),
          clientEmail: this.config.get(FIREBASE_CLIENT_EMAIL),
          privateKey: this.config
            .get(FIREBASE_PRIVATE_KEY)
            ?.replace(/\\n/g, '\n'),
        }),
      });
    }
  }

  verifyIdToken(idToken: string) {
    return admin.auth().verifyIdToken(idToken);
  }

  async validateUserWithIdToken(idToken: string) {
    const {
      email,
      uid,
      email_verified,
      picture,
      firebase: { sign_in_provider },
      ...rest
    } = await this.verifyIdToken(idToken);

    console.log({ rest });

    let oauthUser = await this.userModel.findOne({
      where: { email },
    });

    const provider = sign_in_provider as AllowedProviders;

    if (oauthUser && oauthUser.provider !== 'credentials') {
      if (provider !== oauthUser.provider)
        throw new ForbiddenException(
          `This account was not registered with '${provider.split('.')[0]}', please sign in with '${oauthUser.provider.split('.')[0]}' instead`,
        );

      return oauthUser;
    } else {
      // If user doesn't already exist, then create a new user
      if (!SUPPORTED_PROVIDERS.includes(provider))
        throw new ForbiddenException(
          'Please register using either of google, facebook, apple or your phone number and password,',
        );

      oauthUser = await this.userModel.create({
        socialId: uid,
        email,
        provider,
        email_verified,
        terms_of_service: true,
        picture: picture.replace('s96-c', 's384-c'), // I'm just increasing the image resolution here
      });
    }

    return oauthUser;
  }
}
