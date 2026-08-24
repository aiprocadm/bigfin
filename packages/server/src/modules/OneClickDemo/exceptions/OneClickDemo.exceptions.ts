import { NotFoundException } from '@nestjs/common';
import { ONE_CLICK_DEMO_ERRORS } from '../OneClickDemo.types';

/**
 * Демо-режим выключен. Отвечаем «не найдено», а не «запрещено»: снаружи
 * выключенная возможность не должна выглядеть как существующая.
 */
export class OneClickDemoDisabledException extends NotFoundException {
  constructor() {
    super({
      statusCode: 404,
      error: 'Not Found',
      message: 'The one-click demo is disabled.',
      code: ONE_CLICK_DEMO_ERRORS.DEMO_DISABLED,
    });
  }
}

export class OneClickDemoNotFoundException extends NotFoundException {
  constructor() {
    super({
      statusCode: 404,
      error: 'Not Found',
      message: 'The given demo id is not found.',
      code: ONE_CLICK_DEMO_ERRORS.DEMO_NOT_FOUND,
    });
  }
}
