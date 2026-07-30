import { ClsService } from 'nestjs-cls';
import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SystemUser } from '@/modules/System/models/SystemUser';
import { TenantModel } from '@/modules/System/models/TenantModel';
import { UserTenant } from '@/modules/System/models/UserTenant.model';
import { ModelObject } from 'objection';
import { JwtPayload } from '../Auth.interfaces';
import { InvalidEmailPasswordException } from '../exceptions/InvalidEmailPassword.exception';
import { UserNotFoundException } from '../exceptions/UserNotFound.exception';
import { TwoFactorTokenInvalidException } from '@/modules/TwoFactor/exceptions/TwoFactor.exceptions';

/** Метка полу-токена: годен только для второго шага входа (ввода кода 2FA). */
const TWO_FACTOR_TOKEN_SCOPE = 'two-factor';

@Injectable()
export class AuthSigninService {
  constructor(
    @Inject(SystemUser.name)
    private readonly systemUserModel: typeof SystemUser,

    @Inject(TenantModel.name)
    private readonly tenantModel: typeof TenantModel,

    @Inject(UserTenant.name)
    private readonly userTenantModel: typeof UserTenant,

    private readonly jwtService: JwtService,
    private readonly clsService: ClsService,
  ) { }

  /**
   * Validates the given email and password.
   * @param {string} email - Signin email address.
   * @param {string} password - Signin password.
   * @returns {Promise<ModelObject<SystemUser>>}
   */
  async signin(
    email: string,
    password: string,
  ): Promise<ModelObject<SystemUser>> {
    let user: SystemUser;

    try {
      user = await this.systemUserModel
        .query()
        .findOne({ email })
        .throwIfNotFound();
    } catch (err) {
      throw new InvalidEmailPasswordException(email);
    }
    if (!(await user.checkPassword(password))) {
      throw new InvalidEmailPasswordException(email);
    }
    return user;
  }

  /**
   * Verifies the given jwt payload.
   * @param {JwtPayload} payload
   * @returns {Promise<any>}
   */
  async verifyPayload(payload: JwtPayload): Promise<any> {
    let user: SystemUser;
    let tenant: TenantModel | undefined;

    // Полу-токен 2FA — не access-токен: обычные запросы с ним не пускаем.
    if ((payload as any).scope === TWO_FACTOR_TOKEN_SCOPE) {
      throw new TwoFactorTokenInvalidException();
    }
    try {
      user = await this.systemUserModel
        .query()
        .findOne({ email: payload.sub })
        .throwIfNotFound();

      this.clsService.set('userId', user.id);
    } catch (error) {
      throw new UserNotFoundException(String(payload.sub));
    }
    return payload;
  }

  /**
   * Подписывает полу-токен для второго шага входа (2FA): 5 минут,
   * scope 'two-factor', как access-токен не работает.
   */
  signPendingToken(user: SystemUser): string {
    return this.jwtService.sign(
      { sub: user.email, scope: TWO_FACTOR_TOKEN_SCOPE },
      { expiresIn: '5m' },
    );
  }

  /**
   * Проверяет полу-токен второго шага входа и возвращает пользователя.
   * Битый, просроченный или «не тот» токен → 401 TWO_FACTOR_TOKEN_INVALID.
   */
  async verifyPendingToken(token: string): Promise<SystemUser> {
    let payload: JwtPayload & { scope?: string };

    try {
      payload = this.jwtService.verify(token);
    } catch (error) {
      throw new TwoFactorTokenInvalidException();
    }
    if (payload.scope !== TWO_FACTOR_TOKEN_SCOPE) {
      throw new TwoFactorTokenInvalidException();
    }
    try {
      return await this.systemUserModel
        .query()
        .findOne({ email: payload.sub })
        .throwIfNotFound();
    } catch (error) {
      throw new TwoFactorTokenInvalidException();
    }
  }

  /**
   * Resolves which tenant a user should sign in to:
   *  1. Their explicit default workspace (`defaultTenantId`).
   *  2. Their initial/legacy workspace (`tenantId`).
   *  3. The first active workspace they have a membership in.
   * Returns null when the user has no active workspace available.
   */
  async resolveSigninTenant(user: SystemUser): Promise<TenantModel | null> {
    if (user.defaultTenantId) {
      const tenant = await this.tryGetActiveTenantForUser(
        user.id,
        user.defaultTenantId,
      );
      if (tenant) return tenant;
    }
    if (user.tenantId) {
      const tenant = await this.tryGetActiveTenantForUser(
        user.id,
        user.tenantId,
      );
      if (tenant) return tenant;
    }
    const memberships = await this.userTenantModel
      .query()
      .where('userId', user.id)
      .withGraphFetched('tenant')
      .orderBy('id', 'asc');

    const active = memberships.find((m) => m.tenant?.isActive);
    return active?.tenant ?? null;
  }

  /**
   * Returns the tenant only when the user is a member and the tenant is active.
   */
  private async tryGetActiveTenantForUser(
    userId: number,
    tenantId: number,
  ): Promise<TenantModel | null> {
    const membership = await this.userTenantModel
      .query()
      .where({ userId, tenantId })
      .withGraphFetched('tenant')
      .first();

    if (!membership?.tenant?.isActive) return null;
    return membership.tenant;
  }

  /**
   *
   * @param {SystemUser} user
   * @returns {string}
   */
  signToken(user: SystemUser): string {
    const payload = {
      sub: user.email,
    };
    return this.jwtService.sign(payload);
  }
}
