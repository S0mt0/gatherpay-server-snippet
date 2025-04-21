import { plainToInstance } from 'class-transformer';
import { IsString, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  DATABASE_URL: string;
  REDIS_CLOUD_URL: string;

  JWT_ACCESS_TOKEN_SECRET: string;

  JWT_REFRESH_TOKEN_SECRET: string;

  TWILIO_AUTH_TOKEN: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_SERVICE_SID: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
