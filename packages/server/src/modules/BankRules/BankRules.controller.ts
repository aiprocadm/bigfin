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

@Controller('banking/rules')
@ApiTags('Bank Rules')
@ApiExtraModels(BankRuleResponseDto)
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class BankRulesController {
  constructor(
    private readonly bankRulesApplication: BankRulesApplication,
    private readonly applyRuleToPast: ApplyRuleToPastService,
  ) {}

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
    return this.bankRulesApplication.editBankRule(ruleId, editRuleDTO);
  }

  @Delete(':id')
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'Delete the given bank rule.' })
  @ApiResponse({
    status: 200,
    description: 'The bank rule has been successfully deleted.',
  })
  async deleteBankRule(@Param('id') ruleId: number): Promise<void> {
    return this.bankRulesApplication.deleteBankRule(ruleId);
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
