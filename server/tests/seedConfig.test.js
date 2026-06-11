import { jest } from '@jest/globals';
import { getAdminSeedConfig } from '../scripts/seedAdmin.js';
import {
  getDemoTransporterLogMessage,
  getDemoTransporterSeedConfig,
} from '../scripts/seedDemoUsage.js';
import { getSeedSupplierConfig } from '../scripts/seedProducts.js';

const savedEnv = {};
const managedEnvKeys = [
  'ADMIN_PASSWORD',
  'ALLOW_DEV_SEED_CREDENTIALS',
  'NODE_ENV',
  'SEED_SUPPLIER_PASSWORD',
  'SEED_TRANSPORTER_PASSWORD',
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
    expect(warnSpy).toHaveBeenCalledWith(expect.not.stringContaining('admin123'));
  });

  it('accepts explicit strong admin, supplier, and transporter passwords', () => {
    process.env.NODE_ENV = 'production';
    process.env.ADMIN_PASSWORD = 'unique-admin-password-2026';
    process.env.SEED_SUPPLIER_PASSWORD = 'unique-supplier-password-2026';
    process.env.SEED_TRANSPORTER_PASSWORD = 'unique-transporter-password-2026';

    expect(getAdminSeedConfig().password).toBe('unique-admin-password-2026');
    expect(getSeedSupplierConfig().password).toBe('unique-supplier-password-2026');
    expect(getDemoTransporterSeedConfig().password).toBe('unique-transporter-password-2026');
  });

  it('refuses default supplier credentials when NODE_ENV is unset', () => {
    expect(() => getSeedSupplierConfig()).toThrow('Refusing to seed a supplier with an unsafe password');
  });

  it('requires explicit opt-in for development transporter defaults without logging the password', () => {
    process.env.NODE_ENV = 'development';

    expect(() => getDemoTransporterSeedConfig()).toThrow('ALLOW_DEV_SEED_CREDENTIALS=1');

    process.env.ALLOW_DEV_SEED_CREDENTIALS = '1';
    expect(getDemoTransporterSeedConfig()).toMatchObject({
      email: 'transporter@smartstock.local',
      password: 'seed-transporter123',
    });
    expect(warnSpy).toHaveBeenCalledWith(expect.not.stringContaining('seed-transporter123'));
  });

  it('formats demo transporter output without plaintext passwords', () => {
    process.env.SEED_TRANSPORTER_PASSWORD = 'unique-transporter-password-2026';

    const message = getDemoTransporterLogMessage({ email: 'ops-transporter@example.test' });

    expect(message).toContain('ops-transporter@example.test');
    expect(message).not.toContain('unique-transporter-password-2026');
    expect(message).not.toContain('seed-transporter123');
  });

  it('rejects explicit passwords that only become unsafe after trimming', () => {
    process.env.ADMIN_PASSWORD = 'admin123       ';
    process.env.SEED_SUPPLIER_PASSWORD = 'seed-supplier123       ';
    process.env.SEED_TRANSPORTER_PASSWORD = 'seed-transporter123       ';

    expect(() => getAdminSeedConfig()).toThrow('Refusing to seed an admin with an unsafe password');
    expect(() => getSeedSupplierConfig()).toThrow('Refusing to seed a supplier with an unsafe password');
    expect(() => getDemoTransporterSeedConfig()).toThrow('Refusing to seed a transporter with an unsafe password');
  });

  it('rejects explicitly empty seed passwords instead of falling back to development defaults', () => {
    process.env.NODE_ENV = 'development';
    process.env.ALLOW_DEV_SEED_CREDENTIALS = '1';
    process.env.ADMIN_PASSWORD = '';
    process.env.SEED_SUPPLIER_PASSWORD = '';
    process.env.SEED_TRANSPORTER_PASSWORD = '';

    expect(() => getAdminSeedConfig()).toThrow('Refusing to seed an admin with an unsafe password');
    expect(() => getSeedSupplierConfig()).toThrow('Refusing to seed a supplier with an unsafe password');
    expect(() => getDemoTransporterSeedConfig()).toThrow('Refusing to seed a transporter with an unsafe password');
  });
});
