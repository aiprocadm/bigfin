import { ForbiddenException, Injectable } from '@nestjs/common';
import { MoyskladSettingsService } from './MoyskladSettings.service';
import { MoyskladApiService } from './MoyskladApi.service';
import {
  mapMoyskladProduct,
  mapMoyskladSale,
  MoyskladProduct,
  MoyskladSale,
} from './mapMoysklad';
import {
  ImportMoyskladProductsService,
  MoyskladImportPreview,
  MoyskladImportResult,
} from './commands/ImportMoyskladProducts.service';
import { FeaturesManager } from '@/modules/Features/FeaturesManager';
import { Features } from '@/common/types/Features';

export interface MoyskladPreview {
  products: MoyskladProduct[];
  sales: MoyskladSale[];
}

/**
 * Прикладной слой интеграции МойСклад (㉛). Флаг `moysklad`. MVP — pull-превью
 * (товары/продажи read-only); запись в учёт по статьям — отдельное решение.
 */
@Injectable()
export class MoySkladApplication {
  constructor(
    private readonly featuresManager: FeaturesManager,
    private readonly settings: MoyskladSettingsService,
    private readonly api: MoyskladApiService,
    private readonly importProducts: ImportMoyskladProductsService,
  ) {}

  /** Статус подключения (для UI). */
  public async status(): Promise<{ connected: boolean }> {
    await this.assertEnabled();
    return { connected: Boolean(await this.settings.getToken()) };
  }

  /** Подключает МойСклад: валидирует токен пробным вызовом, сохраняет. */
  public async connect(token: string): Promise<{ connected: true }> {
    await this.assertEnabled();
    await this.api.ping(token);
    await this.settings.setToken(token);
    return { connected: true };
  }

  /** Отключает МойСклад. */
  public async disconnect(): Promise<{ connected: false }> {
    await this.assertEnabled();
    await this.settings.clearToken();
    return { connected: false };
  }

  /** Превью товаров и продаж из МойСклад (read-only). */
  public async preview(): Promise<MoyskladPreview> {
    await this.assertEnabled();
    const token = await this.settings.getToken();
    if (!token) return { products: [], sales: [] };

    const [productsRaw, salesRaw] = await Promise.all([
      this.api.list(token, 'product'),
      this.api.list(token, 'demand'),
    ]);
    return {
      products: productsRaw.map(mapMoyskladProduct),
      sales: salesRaw.map(mapMoyskladSale),
    };
  }

  /** Что даст импорт товаров: сколько создастся/обновится и образец строк. */
  public async importPreview(): Promise<MoyskladImportPreview> {
    await this.assertEnabled();
    return this.importProducts.preview();
  }

  /** Переносит справочник товаров МойСклад в карточки Bigfin. */
  public async import(): Promise<MoyskladImportResult> {
    await this.assertEnabled();
    return this.importProducts.import();
  }

  private async assertEnabled(): Promise<void> {
    const enabled = await this.featuresManager.accessible(Features.MOYSKLAD);
    if (!enabled) throw new ForbiddenException('Интеграция МойСклад выключена');
  }
}
