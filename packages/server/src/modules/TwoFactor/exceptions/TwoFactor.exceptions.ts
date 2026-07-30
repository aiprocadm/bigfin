import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ERRORS } from '../TwoFactor.constants';

export class TwoFactorAlreadyEnabledException extends BadRequestException {
  constructor() {
    super({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Two-factor authentication is already enabled.',
      code: ERRORS.TWO_FACTOR_ALREADY_ENABLED,
    });
  }
}

export class TwoFactorNotEnabledException extends BadRequestException {
  constructor() {
    super({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Two-factor authentication is not enabled.',
      code: ERRORS.TWO_FACTOR_NOT_ENABLED,
    });
  }
}

export class TwoFactorNotConfiguredException extends BadRequestException {
  constructor() {
    super({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Two-factor authentication setup has not been started.',
      code: ERRORS.TWO_FACTOR_NOT_CONFIGURED,
    });
  }
}

export class TwoFactorInvalidCodeException extends UnauthorizedException {
  constructor() {
    super({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid two-factor authentication code.',
      code: ERRORS.TWO_FACTOR_INVALID_CODE,
    });
  }
}

export class TwoFactorInvalidPasswordException extends UnauthorizedException {
  constructor() {
    super({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid password.',
      code: ERRORS.TWO_FACTOR_INVALID_PASSWORD,
    });
  }
}

export class TwoFactorTokenInvalidException extends UnauthorizedException {
  constructor() {
    super({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Two-factor token is invalid or expired.',
      code: ERRORS.TWO_FACTOR_TOKEN_INVALID,
    });
  }
}
