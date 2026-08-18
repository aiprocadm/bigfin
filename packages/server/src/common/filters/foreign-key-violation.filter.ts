import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ForeignKeyViolationError } from 'objection';

/**
 * Падение по внешнему ключу БД → понятный 409 вместо голого 500 (С1 карты v14).
 *
 * Такое падение — всегда следствие пропущенной прикладной проверки: удаляемая
 * запись связана с другими данными (например, у покупателя есть кредит-ноты,
 * не объявленные в relationMappings — deleteIfNoRelations их не видит), либо
 * запись ссылается на несуществующий id. Пользователь должен получить деловой
 * код, а не «Internal server error».
 */
@Catch(ForeignKeyViolationError)
export class ForeignKeyViolationFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = HttpStatus.CONFLICT;

    response.status(status).json({
      errors: [
        {
          statusCode: status,
          type:
            request.method === 'DELETE'
              ? 'MODEL_HAS_RELATIONS'
              : 'FOREIGN_KEY_VIOLATION',
          message: null,
        },
      ],
    });
  }
}
