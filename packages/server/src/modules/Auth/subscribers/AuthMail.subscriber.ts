import { Injectable } from '@nestjs/common';
import { events } from '@/common/events/events';
import { OnEvent } from '@nestjs/event-emitter';
import {
  IAuthSendedResetPassword,
  IAuthSignedUpEventPayload,
  ISignUpConfigmResendedEventPayload,
} from '../Auth.interfaces';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { SendResetPasswordMailJobPayload } from '../processors/SendResetPasswordMail.processor';
import {
  SendResetPasswordMailJob,
  SendResetPasswordMailQueue,
  SendSignupVerificationMailJob,
  SendSignupVerificationMailQueue,
} from '../Auth.constants';
import { SendSignupVerificationMailJobPayload } from '../processors/SendSignupVerificationMail.processor';

@Injectable()
export class AuthMailSubscriber {
  constructor(
    @InjectQueue(SendResetPasswordMailQueue)
    private readonly sendResetPasswordMailQueue: Queue,

    @InjectQueue(SendSignupVerificationMailQueue)
    private readonly sendSignupVerificationMailQueue: Queue,
  ) {}

  /**
   * @param {IAuthSignedUpEventPayload | ISignUpConfigmResendedEventPayload} payload
   */
  // suppressErrors: false обязателен — иначе Nest глушит ошибку обработчика,
  // и проброс ниже не доходит до клиента (тот же класс, что чинился у
  // подписчиков журнала в #206).
  @OnEvent(events.auth.signUp, { suppressErrors: false })
  @OnEvent(events.auth.signUpConfirmResended, { suppressErrors: false })
  async handleSignupSendVerificationMail(
    payload: IAuthSignedUpEventPayload | ISignUpConfigmResendedEventPayload,
  ) {
    // Сбой постановки в очередь НЕ глотаем (шаг Ф3 карты v10): иначе человек
    // получает «успех» и ждёт письмо подтверждения, которое никогда не
    // придёт, — не зная, что надо нажать «отправить повторно». Честная
    // ошибка здесь лучше тихой потери.
    await this.sendSignupVerificationMailQueue.add(
      SendSignupVerificationMailJob,
      {
        email: payload.user.email,
        fullName: payload.user.firstName,
        token: payload.user.verifyToken,
      } as SendSignupVerificationMailJobPayload,
      {
        delay: 0,
      },
    );
  }

  /**
   * @param {IAuthSendedResetPassword} payload
   */
  @OnEvent(events.auth.sendResetPassword, { suppressErrors: false })
  async handleSendResetPasswordMail(payload: IAuthSendedResetPassword) {
    await this.sendResetPasswordMailQueue.add(
      SendResetPasswordMailJob,
      {
        user: payload.user,
        token: payload.token,
      } as SendResetPasswordMailJobPayload,
      {
        delay: 0,
      },
    );
  }
}
