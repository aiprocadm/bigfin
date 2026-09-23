import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt.guard';
import { ApiKeyAuthGuard } from './AuthApiKey.guard';
import { getAuthApiKey } from '../Auth.utils';
import { ApiTokenAuthGuard, bearerApiToken } from '../api-token/ApiTokenAuth.guard';

// mixed-auth.guard.ts
@Injectable()
export class MixedAuthGuard implements CanActivate {
  constructor(
    private jwtGuard: JwtAuthGuard,
    private apiKeyGuard: ApiKeyAuthGuard,
    private apiTokenGuard: ApiTokenAuthGuard,
  ) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const apiKey = getAuthApiKey(request.headers['authorization'] || '');

    // Токен публичного API `bgf_…` (FT-091 ТЗ-3).
    if (bearerApiToken(request.headers['authorization'])) {
      return this.apiTokenGuard.canActivate(context);
    }
    if (apiKey) {
      return this.apiKeyGuard.canActivate(context);
    } else {
      return this.jwtGuard.canActivate(context);
    }
  }
}
