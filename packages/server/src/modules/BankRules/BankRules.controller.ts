import {
  ApiOperation,
  ApiTags,
  ApiResponse,
  getSchemaPath,
  ApiExtraModels,
} from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { BankRulesApplication } from './BankRulesApplication';
import { CreateBankRuleDto } from './dtos/BankRule.dto';
import { EditBankRuleDto } from './dtos/BankRule.dto';
import { BankRuleResponseDto } from './dtos/BankRuleResponse.dto';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { PreferencesAction } from '@/modules/Settings/Settings.types';
import { ApplyRuleToPastService } from '@/modules/BankingTranasctionsRegonize/commands/ApplyRuleToPast.service';
import { ApplyBankRuleToPastDto } from './dtos/ApplyBankRuleToPast.dto';
import { BankRuleManagementService } from './commands/BankRuleManagement.service';
import { GetTransactionRuleApplicationsService } from './queries/GetTransactionRuleApplications.service';
import {
  BankRuleConflictsDto,
  PauseBankRuleDto,
  ReorderBankRulesDto,
} from './dtos/BankRuleManagement.dto';

@Controller('banking/rules')
@ApiTags('Bank Rules')
@ApiExtraModels(BankRuleResponseDto)
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class BankRulesController {
  constructor(
    private readonly bankRulesApplication: BankRulesApplication,
    private readonly applyRuleToPast: ApplyRuleToPastService,
    private readonly management: BankRuleManagementService,
    private readonly ruleApplications: GetTransactionRuleApplicationsService,
  ) {}

  // Ручки с постоянными словами — ДО ручек с «:id»: иначе «order» и
  // «conflicts» приняли бы за номер правила.

  // Порядок перетаскиванием (FT-035 ТЗ-3): весь список сверху вниз.
  @Put('order')
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'Новый порядок правил сверху вниз.' })
  async reorderBankRules(@Body() body: ReorderBankRulesDto) {
    return this.management.reorder(body.ids);
  }

  // Конфликт с существующими правилами — до сохранения (FT-035).
  @Post('conflicts')
  // Проверяет только тот, кто сохраняет правило, — то же право.
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'С какими правилами спорит черновик правила.' })
  async bankRuleConflicts(@Body() body: BankRuleConflictsDto) {
    return this.management.conflicts(body);
  }

  // История применений к денежной операции (FT-036).
  @Get('applications/transaction/:transactionId')
  @ApiOperation({ summary: 'Какие автоправила и что поставили операции.' })
  async transactionRuleApplications(@Param('transactionId') transactionId: number) {
    return this.ruleApplications.byTransaction(Number(transactionId));
  }

  @Post(':id/pause')
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'Поставить правило на паузу или снять с неё.' })
  async pauseBankRule(@Param('id') ruleId: number, @Body() body: PauseBankRuleDto) {
    return this.management.setPaused(Number(ruleId), body.paused);
  }

  @Post(':id/clone')
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'Копия правила « (копия)» — на паузе, в конце списка.' })
  async cloneBankRule(@Param('id') ruleId: number) {
    return this.management.clone(Number(ruleId));
  }

  // «Применить к прошлым операциям» (FT-034 ТЗ-3): сначала список ровно тех
  // строк, что подходят, потом — фоновая задача по отмеченным.
  @Get(':id/preview')
  @ApiOperation({ summary: 'Неразнесённые строки выписки, подходящие под правило.' })
  async previewBankRule(@Param('id') ruleId: number) {
    return this.applyRuleToPast.preview(Number(ruleId));
  }

  @Post(':id/apply')
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'Разнести отмеченные строки по правилу в фоне.' })
  async applyBankRuleToPast(
    @Param('id') ruleId: number,
    @Body() body: ApplyBankRuleToPastDto,
  ) {
    return this.applyRuleToPast.queueApply(Number(ruleId), body.ids);
  }

  @Post()
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'Create a new bank rule.' })
  @ApiResponse({
    status: 201,
    description: 'The bank rule has been successfully created.',
    schema: {
      $ref: getSchemaPath(BankRuleResponseDto),
    },
  })
  async createBankRule(
    @Body() createRuleDTO: CreateBankRuleDto,
  ): Promise<BankRuleResponseDto> {
    return this.bankRulesApplication.createBankRule(createRuleDTO);
  }

  @Put(':id')
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'Edit the given bank rule.' })
  async editBankRule(
    @Param('id') ruleId: number,
    @Body() editRuleDTO: EditBankRuleDto,
  ): Promise<void> {
    return this.bankRulesApplication.editBankRule(Number(ruleId), editRuleDTO);
  }

  @Delete(':id')
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'Delete the given bank rule.' })
  @ApiResponse({
    status: 200,
    description: 'The bank rule has been successfully deleted.',
  })
  async deleteBankRule(@Param('id') ruleId: number): Promise<void> {
    // Номер из адреса приходит строкой: журнал действий такую запись
    // отвергал, и удаление правила в журнал не попадало.
    return this.bankRulesApplication.deleteBankRule(Number(ruleId));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieves the bank rule details.' })
  @ApiResponse({
    status: 200,
    description: 'The bank rule details have been successfully retrieved.',
    schema: { $ref: getSchemaPath(BankRuleResponseDto) },
  })
  async getBankRule(@Param('id') ruleId: number): Promise<BankRuleResponseDto> {
    return this.bankRulesApplication.getBankRule(ruleId);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieves the bank rules.' })
  @ApiResponse({
    status: 200,
    description: 'The bank rules have been successfully retrieved.',
    schema: {
      type: 'array',
      items: { $ref: getSchemaPath(BankRuleResponseDto) },
    },
  })
  async getBankRules(): Promise<BankRuleResponseDto[]> {
    return this.bankRulesApplication.getBankRules();
  }
}
