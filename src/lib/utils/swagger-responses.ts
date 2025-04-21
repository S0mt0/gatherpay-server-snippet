import { ApiProperty } from '@nestjs/swagger';

export class BaseResponseDto<T = any> {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Success' })
  message: string;

  @ApiProperty({ required: false })
  data?: T;

  @ApiProperty({ example: '2025-04-14T13:47:23.456Z' })
  timestamp: string;
}

export const BaseResponseObject = {
  statusCode: 200,

  message: 'Success',

  data: {},

  timestamp: '2025-04-14T13:47:23.456Z',
};

export class LoginResponseDto extends BaseResponseDto {
  @ApiProperty({
    example: { user: {}, access_token: 'eg.Example.XXXXXXX.Token' },
  })
  data: object;
}

export class RefreshTokenResponseDto extends BaseResponseDto {
  @ApiProperty({
    example: { user: {}, access_token: 'eg.Example.XXXXXXX.Token' },
  })
  data: object;
}
