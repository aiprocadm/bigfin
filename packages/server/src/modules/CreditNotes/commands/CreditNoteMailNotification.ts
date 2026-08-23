import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SendCreditNoteMailJob, SendCreditNoteMailQueue } from '../constants';
import { mergeAndValidateMailOptions } from '@/modules/MailNotification/utils';
import { transformCreditNoteToMailDataArgs } from '../utils';
import { GetCreditNoteService } from '../queries/GetCreditNote.service';
import { GetCreditNotePdf } from '../queries/GetCreditNotePdf.serivce';
import { ContactMailNotification } from '@/modules/MailNotification/ContactMailNotification';
import { events } from '@/common/events/events';
import {
  CreditNoteMailOpts,
  CreditNoteMailOptsDTO,
  CreditNoteSendMailPayload,
  ICreditNoteMailPresend,
} from '../types/CreditNotes.types';
import { CreditNote } from '../models/CreditNote';
import { MailTransporter } from '@/modules/Mail/MailTransporter.service';
import { Mail } from '@/modules/Mail/Mail';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { GetCreditNoteMailTemplateService } from '../queries/GetCreditNoteMailTemplate.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { OrganizationI18nService } from '@/modules/OrganizationI18n/OrganizationI18n.service';

@Injectable()
export class CreditNoteMailNotification {
  constructor(
    private readonly getCreditNoteService: GetCreditNoteService,
    private readonly creditNotePdfService: GetCreditNotePdf,
    private readonly contactMailNotification: ContactMailNotification,
    private readonly eventEmitter: EventEmitter2,
    private readonly mailTransporter: MailTransporter,
    private readonly tenancyContext: TenancyContext,
    private readonly getCreditNoteMailTemplateService: GetCreditNoteMailTemplateService,
    private readonly orgI18n: OrganizationI18nService,

    @Inject(CreditNote.name)
    private readonly creditNoteModel: TenantModelProxy<typeof CreditNote>,

    @InjectQueue(SendCreditNoteMailQueue)
    private readonly sendCreditNoteMailQueue: Queue,
  ) {}

  /**
   * Ставит письмо кредит-ноты в очередь отправки.
   * @param {number} creditNoteId - Credit note id.
   * @param {CreditNoteMailOptsDTO} messageOptions - Message options.
   */
  public async triggerMail(
    creditNoteId: number,
    messageOptions: CreditNoteMailOptsDTO,
  ) {
    // Падаем «не найдено» ДО постановки в очередь: иначе клиент получает
    // 200 «отправлено», а письмо молча не уходит (тот же урок, что у чека).
    await this.creditNoteModel()
      .query()
      .findById(creditNoteId)
      .throwIfNotFound();

    const tenant = await this.tenancyContext.getTenant();
    const user = await this.tenancyContext.getSystemUser();

    const payload = {
      creditNoteId,
      messageOpts: messageOptions,
      userId: user.id,
      organizationId: tenant.organizationId,
    } as CreditNoteSendMailPayload;

    await this.sendCreditNoteMailQueue.add(SendCreditNoteMailJob, {
      ...payload,
    });
    await this.eventEmitter.emitAsync(events.creditNote.onPreMailSend, {
      creditNoteId,
      messageOptions,
    } as ICreditNoteMailPresend);
  }

  /**
   * Отдаёт настройки письма кредит-ноты по умолчанию.
   * @param {number} creditNoteId - Credit note id.
   * @returns {Promise<CreditNoteMailOpts>}
   */
  public async getMailOptions(
    creditNoteId: number,
    defaultSubject?: string,
    defaultMessage?: string,
  ): Promise<CreditNoteMailOpts> {
    const creditNote = await this.creditNoteModel()
      .query()
      .findById(creditNoteId)
      .throwIfNotFound();

    const formatArgs = await this.textFormatterArgs(creditNoteId);
    const mailOptions =
      await this.contactMailNotification.getDefaultMailOptions(
        creditNote.customerId,
      );

    // Тема и тело по умолчанию — на языке организации. Перевод вызывается
    // БЕЗ args, чтобы Mustache-плейсхолдеры ({Customer Name} и т.п.)
    // сохранились и подставились позже в formatMailOptions.
    const subject =
      defaultSubject ??
      (await this.orgI18n.translate('mail.credit_note.subject'));
    const message =
      defaultMessage ?? (await this.orgI18n.translate('mail.credit_note.body'));

    return {
      ...mailOptions,
      message,
      subject,
      attachCreditNote: true,
      formatArgs,
    };
  }

  /**
   * Аргументы подстановки текста письма.
   * @param {number} creditNoteId - Credit note id.
   * @returns {Promise<Record<string, string>>}
   */
  public textFormatterArgs = async (
    creditNoteId: number,
  ): Promise<Record<string, string>> => {
    const creditNote =
      await this.getCreditNoteService.getCreditNote(creditNoteId);
    const commonArgs = await this.contactMailNotification.getCommonFormatArgs();

    return {
      ...commonArgs,
      ...transformCreditNoteToMailDataArgs(creditNote),
    };
  };

  /**
   * Подставляет значения и оборачивает тело письма в шаблон.
   * @param {number} creditNoteId - Credit note id.
   * @param {CreditNoteMailOpts} mailOptions - Mail options.
   * @returns {Promise<CreditNoteMailOpts>}
   */
  public async formatMailOptions(
    creditNoteId: number,
    mailOptions: CreditNoteMailOpts,
  ): Promise<CreditNoteMailOpts> {
    const formatterArgs = await this.textFormatterArgs(creditNoteId);
    const formattedOptions =
      (await this.contactMailNotification.formatMailOptions(
        mailOptions,
        formatterArgs,
      )) as CreditNoteMailOpts;

    const message =
      await this.getCreditNoteMailTemplateService.getMailTemplate(
        creditNoteId,
        { message: formattedOptions.message },
      );
    return { ...formattedOptions, message };
  }

  /**
   * Сливает пользовательские настройки письма с настройками по умолчанию.
   * @param {number} creditNoteId - Credit note id.
   * @param {CreditNoteMailOptsDTO} messageOpts - Message options.
   * @returns {Promise<CreditNoteMailOpts>}
   */
  public getFormatMailOptions = async (
    creditNoteId: number,
    messageOpts: CreditNoteMailOptsDTO,
  ): Promise<CreditNoteMailOpts> => {
    const defaultMessageOptions = await this.getMailOptions(creditNoteId);
    const parsedMessageOpts = mergeAndValidateMailOptions(
      defaultMessageOptions,
      messageOpts,
    ) as CreditNoteMailOpts;

    return this.formatMailOptions(creditNoteId, parsedMessageOpts);
  };

  /**
   * Отправляет письмо кредит-ноты (вызывается из обработчика очереди).
   * @param {number} creditNoteId - Credit note id.
   * @param {CreditNoteMailOptsDTO} messageOpts - Message options.
   */
  public async sendMail(
    creditNoteId: number,
    messageOpts: CreditNoteMailOptsDTO,
  ) {
    const formattedMessageOptions = await this.getFormatMailOptions(
      creditNoteId,
      messageOpts,
    );
    const mail = new Mail()
      .setSubject(formattedMessageOptions.subject)
      .setTo(formattedMessageOptions.to)
      .setCC(formattedMessageOptions.cc)
      .setBCC(formattedMessageOptions.bcc)
      .setContent(formattedMessageOptions.message);

    // Прикладывает pdf кредит-ноты.
    if (formattedMessageOptions.attachCreditNote) {
      const [creditNotePdfBuffer, filename] =
        await this.creditNotePdfService.getCreditNotePdf(creditNoteId);

      mail.setAttachments([
        { filename: `${filename}.pdf`, content: creditNotePdfBuffer },
      ]);
    }
    const eventPayload = { creditNoteId, messageOptions: {} };

    await this.eventEmitter.emitAsync(
      events.creditNote.onMailSend,
      eventPayload,
    );
    await this.mailTransporter.send(mail);

    await this.eventEmitter.emitAsync(
      events.creditNote.onMailSent,
      eventPayload,
    );
  }
}
