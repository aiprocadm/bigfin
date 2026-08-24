import { parseBoolean } from '@/utils/parse-boolean';
import { registerAs } from '@nestjs/config';

/**
 * Демо-режим «в один щелчок» (Д1 карты v18, решение 21).
 *
 * По умолчанию ВЫКЛЮЧЕН: ручка создаёт полноценного пользователя и тенанта
 * без всякой проверки, кто просит. Включать только там, где это осознанно
 * нужно (лендинг), и вместе с пределом частоты по IP.
 */
export default registerAs('oneClickDemo', () => ({
  enable: parseBoolean<boolean>(process.env.ONE_CLICK_DEMO_ENABLE, false),
  demoUrl: process.env.ONE_CLICK_DEMO_URL || '/demo',
  // Сколько демо-организаций разрешено создать с одного адреса за окно.
  rateLimit: Number(process.env.ONE_CLICK_DEMO_RATE_LIMIT || 3),
  rateTtl: Number(process.env.ONE_CLICK_DEMO_RATE_TTL || 3600000),
  // Сколько часов живёт демо-организация до автоматической уборки (Д2 v18).
  // Каждое демо — отдельная база данных, поэтому копить их вечно нельзя.
  ttlHours: Number(process.env.ONE_CLICK_DEMO_TTL_HOURS || 24),
}));
