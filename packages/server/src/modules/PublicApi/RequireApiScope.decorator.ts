// © 2026 Bigfin
import { SetMetadata } from '@nestjs/common';

export const API_SCOPE_KEY = 'requiredApiScope';

/**
 * Какое право токена API (`bgf_…`) нужно ручке (FT-091 ТЗ-3).
 *
 * РУЧКА БЕЗ ЭТОЙ МЕТКИ ПО ТОКЕНУ ЗАКРЫТА. Запрет по умолчанию: токен
 * выдают внешней программе, и всё, что ей не открыли явно, для неё не
 * существует. Человек со своим входом метку не замечает — ему права дают
 * роли, как и раньше.
 */
export const RequireApiScope = (scope: string) => SetMetadata(API_SCOPE_KEY, scope);
