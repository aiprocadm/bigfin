import { Features } from '@/common/types/Features';
import { IFeatureConfiugration } from '@/common/types/Features';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FeaturesConfigure {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Get the feature configure.
   * @returns {IFeatureConfiugration[]}
   */

  getConfigure(): IFeatureConfiugration[] {
    return [
      {
        name: Features.BRANCHES,
        defaultValue: false,
      },
      {
        name: Features.WAREHOUSES,
        defaultValue: false,
      },
      {
        name: Features.BankSyncing,
        defaultValue: this.configService.get('bankfeed.enabled') ?? false,
      },
      {
        name: Features.MGMT_ARTICLES,
        defaultValue: false,
      },
      {
        name: Features.PAYMENT_CALENDAR,
        defaultValue: false,
      },
      {
        name: Features.BUDGETS,
        defaultValue: false,
      },
      {
        name: Features.CUSTOMERS_LIST_V2,
        defaultValue: false,
      },
      {
        name: Features.VENDORS_LIST_V2,
        defaultValue: false,
      },
      {
        name: Features.DEBTS,
        defaultValue: false,
      },
      {
        name: Features.PAYMENT_REQUESTS,
        defaultValue: false,
      },
      {
        name: Features.DEALS,
        defaultValue: false,
      },
      {
        name: Features.COST_ALLOCATION,
        defaultValue: false,
      },
      {
        name: Features.DEAL_STAGES,
        defaultValue: false,
      },
      {
        name: Features.PAYROLL,
        defaultValue: false,
      },
      {
        name: Features.PAYROLL_KPI,
        defaultValue: false,
      },
      {
        name: Features.DATA_QUALITY,
        defaultValue: false,
      },
      {
        name: Features.DIVIDENDS,
        defaultValue: false,
      },
      {
        name: Features.ACCRUAL_PNL,
        defaultValue: false,
      },
    ];
  }
}
