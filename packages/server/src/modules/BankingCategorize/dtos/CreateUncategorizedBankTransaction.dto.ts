import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class UncategorizedBankTransactionDto {
  /** Пакет импорта (FT-043 ТЗ-3): по нему импорт откатывается целиком. */
  @IsOptional()
  importBatchId?: number;

  @IsDateString()
  date: Date | string;

  @IsNumber()
  accountId: number;

  @IsNumber()
  amount: number;

  @IsString()
  currencyCode: string;

  @IsString()
  payee?: string;

  @IsString()
  description?: string;

  @IsString()
  referenceNo?: string | null;

  @IsString()
  plaidTransactionId?: string | null;

  @IsBoolean()
  pending?: boolean;

  @IsString()
  pendingPlaidTransactionId?: string | null;

  @IsString()
  @IsOptional()
  payeeInn?: string | null;

  @IsString()
  @IsOptional()
  externalId?: string | null;

  @IsString()
  batch?: string;
}
