import { Position, Toaster } from '@blueprintjs/core';

/**
 * Общий показчик всплывающих сообщений.
 *
 * Здесь стояло `intent: Intent.WARNING`, но окраска задаётся у **отдельного
 * сообщения**, а не у показчика — эта строка не действовала никогда
 * (Д14 карты v75). Убрана.
 */
export const AppToaster = Toaster.create({
  position: Position.TOP,
});
