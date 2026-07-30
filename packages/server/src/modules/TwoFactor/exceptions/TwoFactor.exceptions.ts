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

// В настройках 2FA неверный код/пароль — ошибка ввода, а не протухшая
// сессия: авторизованный http-клиент webapp разлогинивает на ЛЮБОЙ 401,
// поэтому здесь строго 400. Для второго шага входа есть 401-исключения ниже.
export class TwoFactorInvalidCodeException extends BadRequestException {
  constructor() {
    super({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Invalid two-factor authentication code.',
      code: ERRORS.TWO_FACTOR_INVALID_CODE,
    });
  }
}

export class TwoFactorInvalidPasswordException extends BadRequestException {
  constructor() {
    super({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Invalid password.',
      code: ERRORS.TWO_FACTOR_INVALID_PASSWORD,
    });
  }
}

/** Неверный код на втором шаге входа (публичный роут — 401 уместен). */
export class SigninTwoFactorInvalidCodeException extends UnauthorizedException {
  constructor() {
    super({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid two-factor authentication code.',
      code: ERRORS.TWO_FACTOR_INVALID_CODE,
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
