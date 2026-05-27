import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../schemas';

describe('loginSchema', () => {
  it('accepts valid email + password', () => {
    expect(
      loginSchema.safeParse({ email: 'a@b.ru', password: 'password' }).success,
    ).toBe(true);
  });

  it('rejects invalid email', () => {
    const r = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'password',
    });
    expect(r.success).toBe(false);
  });

  it('rejects empty password', () => {
    const r = loginSchema.safeParse({ email: 'a@b.ru', password: '' });
    expect(r.success).toBe(false);
  });

  it('accepts optional rememberMe', () => {
    expect(
      loginSchema.safeParse({
        email: 'a@b.ru',
        password: 'password',
        rememberMe: true,
      }).success,
    ).toBe(true);
  });
});

describe('registerSchema', () => {
  it('accepts valid name + email + 10-char password + matching confirm + terms', () => {
    const r = registerSchema.safeParse({
      name: 'Иван',
      email: 'a@b.ru',
      password: 'password12',
      confirmPassword: 'password12',
      agreedToTerms: true,
    });
    expect(r.success).toBe(true);
  });

  it('rejects mismatching confirm password', () => {
    const r = registerSchema.safeParse({
      name: 'Иван',
      email: 'a@b.ru',
      password: 'password12',
      confirmPassword: 'different12',
      agreedToTerms: true,
    });
    expect(r.success).toBe(false);
  });

  it('rejects when terms not agreed', () => {
    const r = registerSchema.safeParse({
      name: 'Иван',
      email: 'a@b.ru',
      password: 'password12',
      confirmPassword: 'password12',
      agreedToTerms: false,
    });
    expect(r.success).toBe(false);
  });

  it('rejects password shorter than 10 chars', () => {
    const r = registerSchema.safeParse({
      name: 'Иван',
      email: 'a@b.ru',
      password: 'pass1',
      confirmPassword: 'pass1',
      agreedToTerms: true,
    });
    expect(r.success).toBe(false);
  });

  it('rejects empty name', () => {
    const r = registerSchema.safeParse({
      name: '',
      email: 'a@b.ru',
      password: 'password12',
      confirmPassword: 'password12',
      agreedToTerms: true,
    });
    expect(r.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const r = registerSchema.safeParse({
      name: 'Иван',
      email: 'not-an-email',
      password: 'password12',
      confirmPassword: 'password12',
      agreedToTerms: true,
    });
    expect(r.success).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    expect(
      forgotPasswordSchema.safeParse({ email: 'a@b.ru' }).success,
    ).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(
      forgotPasswordSchema.safeParse({ email: 'not-an-email' }).success,
    ).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('accepts 10-char password with matching confirm', () => {
    const r = resetPasswordSchema.safeParse({
      password: 'password12',
      confirmPassword: 'password12',
    });
    expect(r.success).toBe(true);
  });

  it('rejects mismatching confirm password', () => {
    const r = resetPasswordSchema.safeParse({
      password: 'password12',
      confirmPassword: 'different12',
    });
    expect(r.success).toBe(false);
  });

  it('rejects password shorter than 10 chars', () => {
    const r = resetPasswordSchema.safeParse({
      password: 'pass1',
      confirmPassword: 'pass1',
    });
    expect(r.success).toBe(false);
  });
});
