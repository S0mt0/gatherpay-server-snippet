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
