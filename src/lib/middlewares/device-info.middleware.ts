import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as useragent from 'useragent';

@Injectable()
export class DeviceInfoMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const ip = this.getIpAddress(req);
    const deviceInfo = this.getUserDevice(req);

    req['deviceInfo'] = {
      ip,
      device: deviceInfo,
      userAgent: req.headers['user-agent'],
    };

    next();
  }

  private getIpAddress = (req: Request): string => {
    const forwarded = req.headers['x-forwarded-for'];

    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }

    return req.ip || req.socket.remoteAddress;
  };

  private getUserDevice(req: Request): string {
    const userAgent = req.headers['user-agent'];
    if (!userAgent) return 'Unknown device';

    const agent = useragent.parse(userAgent);
    return `${agent.device.toString()} ${agent.os.toString()} ${agent.toAgent()}`;
  }
}
