// © 2026 Bigfin
import { Module } from '@nestjs/common';

import { McpController } from './Mcp.controller';
import { McpService } from './Mcp.service';

/**
 * MCP-сервер для ИИ-агентов (FT-090 ТЗ-3): тонкий слой поверх публичного API.
 * Своих данных и расчётов у него нет — только вызовы существующих ручек.
 */
@Module({
  controllers: [McpController],
  providers: [McpService],
})
export class McpModule {}
