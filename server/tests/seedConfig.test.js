import { jest } from '@jest/globals';
import { getAdminSeedConfig } from '../scripts/seedAdmin.js';
import { getSeedSupplierConfig } from '../scripts/seedProducts.js';

const savedEnv = {};
const managedEnvKeys = [
  'ADMIN_PASSWORD',
  'ALLOW_DEV_SEED_CREDENTIALS',
  'NODE_ENV',
  'SEED_SUPPLIER_PASSWORD',
];

const clearManagedEnv = () => {
  for (const key of managedEnvKeys) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
};

const restoreManagedEnv = () => {
  for (const key of managedEnvKeys) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
};

describe('seed credential safety', () => {
  let warnSpy;

  beforeEach(() => {
    clearManagedEnv();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    restoreManagedEnv();
    warnSpy.mockRestore();
  });

  it('refuses default admin credentials when NODE_ENV is unset', () => {
    expect(() => getAdminSeedConfig()).toThrow('Refusing to seed an admin with an unsafe password');
  });

  it('requires explicit opt-in for development admin defaults', () => {
    process.env.NODE_ENV = 'development';

    expect(() => getAdminSeedConfig()).toThrow('ALLOW_DEV_SEED_CREDENTIALS=1');

    process.env.ALLOW_DEV_SEED_CREDENTIALS = '1';
    expect(getAdminSeedConfig()).toMatchObject({
      email: 'admin@smartstock.local',
      password: 'admin123',
    });
  });

  it('accepts explicit strong admin and supplier passwords', () => {
    process.env.NODE_ENV = 'production';
    process.env.ADMIN_PASSWORD = 'unique-admin-password-2026';
    process.env.SEED_SUPPLIER_PASSWORD = 'unique-supplier-password-2026';

    expect(getAdminSeedConfig().password).toBe('unique-admin-password-2026');
    expect(getSeedSupplierConfig().password).toBe('unique-supplier-password-2026');
  });

  it('refuses default supplier credentials when NODE_ENV is unset', () => {
    expect(() => getSeedSupplierConfig()).toThrow('Refusing to seed a supplier with an unsafe password');
  });
});
