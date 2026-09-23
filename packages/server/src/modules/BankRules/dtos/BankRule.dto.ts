import { Type } from 'class-transformer';
import {
  IsString,
  IsInt,
  Min,
  IsOptional,
  IsIn,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsNotEmpty,
  IsNumber,
  Max,
  ValidateIf,
} from 'class-validator';
import {
  MAX_RULE_CONDITIONS,
  RULE_COMPARATORS,
  RULE_CONDITION_FIELDS,
} from '../utils/matchRule';
import { BankRuleComparator } from '../types';
import { ApiProperty } from '@nestjs/swagger';
import { ToNumber } from '@/common/decorators/Validators';

class BankRuleConditionDto {
  @IsNotEmpty()
  @IsIn(RULE_CONDITION_FIELDS as unknown as string[])
  field: string;

  // Экран шлёт «not_contains», а здесь стояло «not_contain» — условие
  // «не содержит» отклонялось всегда. Принимаются оба написания старых
  // операторов; движок совпадений понимает и те, и новые.
  @IsNotEmpty()
  @IsIn([...RULE_COMPARATORS, 'equal', 'not_contain'])
  comparator: BankRuleComparator = 'contains';

  @IsNotEmpty()
  value: string;
}

/** Строка правила «Разбить и заполнить» (FT-031 ТЗ-3). */
export class BankRuleSplitDto {
  @ToNumber()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Max(100)
  sharePercent: number;

  @ToNumber()
  @IsInt()
  articleId: number;

  @IsOptional()
  @ToNumber()
  @IsInt()
  projectId?: number | null;

  @IsOptional()
  @ToNumber()
  @IsInt()
  contactId?: number | null;
}

export const BANK_RULE_TYPES = ['assign', 'split', 'transfer'] as const;

export class CommandBankRuleDto {
  /**
   * Тип правила (FT-030…FT-032 ТЗ-3). «Привязать к сделке» (FT-033)
   * приходит с этапом 35 — до тех пор такой тип не принимается.
   */
  @IsOptional()
  @IsIn(BANK_RULE_TYPES as unknown as string[])
  ruleType: 'assign' | 'split' | 'transfer' = 'assign';

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The name of the bank rule',
    example: 'Monthly Salary',
  })
  name: string;

  @IsNotEmpty()
  @ToNumber()
  @IsInt()
  @Min(0)
  @ApiProperty({
    description: 'The order of the bank rule',
    example: 1,
  })
  order: number;

  @IsOptional()
  @ToNumber()
  @IsInt()
  @Min(0)
  @ApiProperty({
    description: 'The account ID to apply the rule if',
    example: 1,
  })
  applyIfAccountId?: number;

  // Пусто — «оба»: и поступления, и списания (FT-030).
  @IsOptional()
  @IsIn(['deposit', 'withdrawal'])
  @ApiProperty({
    description: 'The transaction type to apply the rule if; empty — both',
    example: 'deposit',
  })
  applyIfTransactionType?: 'deposit' | 'withdrawal' | null;

  @IsString()
  @IsIn(['and', 'or'])
  @ApiProperty({
    description: 'The conditions type to apply the rule if',
    example: 'and',
  })
  conditionsType: 'and' | 'or' = 'and';

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_RULE_CONDITIONS)
  @ValidateNested({ each: true })
  @Type(() => BankRuleConditionDto)
  @ApiProperty({
    description: 'The conditions to apply the rule if',
    example: [
      { field: 'description', comparator: 'contains', value: 'Salary' },
    ],
  })
  conditions: BankRuleConditionDto[];

  // Вид операции при разноске. Не обязателен: без него он выводится из
  // направления движения денег (поступление — прочий доход, списание —
  // прочий расход).
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'The category to assign the rule if',
    example: 'other_expense',
  })
  assignCategory?: string;

  // Счёт статьи — обязателен у «Заполнить поля»: без статьи правилу нечего
  // заполнять. У разбиения статьи в строках, у перевода — счёт-получатель.
  @ValidateIf((dto) => (dto.ruleType ?? 'assign') === 'assign')
  @IsInt()
  @Min(0)
  @ToNumber()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The account ID to assign the rule if',
    example: 1,
  })
  assignAccountId?: number;

  @IsOptional()
  @ToNumber()
  @IsInt()
  assignProjectId?: number | null;

  @IsOptional()
  @ToNumber()
  @IsInt()
  assignContactId?: number | null;

  // Счёт-получатель перевода (FT-032).
  @ValidateIf((dto) => dto.ruleType === 'transfer')
  @ToNumber()
  @IsInt()
  @IsNotEmpty()
  transferToAccountId?: number;

  // Строки разбиения (FT-031): от двух — одна строка это не разбиение.
  @ValidateIf((dto) => dto.ruleType === 'split')
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => BankRuleSplitDto)
  splits?: BankRuleSplitDto[];

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'The payee to assign the rule if',
    example: 'Employer Inc.',
  })
  assignPayee?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'The memo to assign the rule if',
    example: 'Monthly Salary',
  })
  assignMemo?: string;
}

export class CreateBankRuleDto extends CommandBankRuleDto {}
export class EditBankRuleDto extends CommandBankRuleDto {}
