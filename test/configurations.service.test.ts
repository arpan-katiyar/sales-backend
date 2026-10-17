import { describe, expect, it } from 'vitest';

import { AppError } from '../src/common/errors/app-error.js';
import type { ConfigurationRow } from '../src/modules/configurations/configurations.repository.js';
import {
  createConfigurationService,
  isValidConfigurationValue,
} from '../src/modules/configurations/configurations.service.js';

function row(overrides: Partial<ConfigurationRow> = {}): ConfigurationRow {
  return {
    id: 1,
    configKey: 'RETAIL_FEATURE',
    configValue: 'false',
    configType: 2,
    description: 'Feature Toggle',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    createdBy: 1,
    updatedBy: 1,
    ...overrides,
  };
}

function memoryStore(initial: ConfigurationRow[]) {
  const rows = initial.map((item) => ({ ...item }));
  return {
    rows,
    async findAll() {
      return rows.map((item) => ({ ...item }));
    },
    async findById(id: number) {
      return rows.find((item) => item.id === id) ?? null;
    },
    async updateValue(id: number, value: string, updatedBy: number) {
      const current = rows.find((item) => item.id === id);
      if (!current) {
        return;
      }
      current.configValue = value;
      current.updatedBy = updatedBy;
      current.updatedAt = new Date();
    },
  };
}

describe('configuration values', () => {
  it('accepts the same values as the Java type enum', () => {
    expect(isValidConfigurationValue(0, 'anything')).toBe(true);
    expect(isValidConfigurationValue(1, '42')).toBe(true);
    expect(isValidConfigurationValue(1, '12.5')).toBe(false);
    expect(isValidConfigurationValue(2, 'TRUE')).toBe(true);
    expect(isValidConfigurationValue(2, 'false')).toBe(true);
    expect(isValidConfigurationValue(2, 'yes')).toBe(false);
  });
});

describe('configuration service', () => {
  it('returns key, value, and the enum name the frontend reads', async () => {
    const store = memoryStore([row()]);
    const service = createConfigurationService(store);

    await expect(service.list()).resolves.toEqual([
      { id: 1, key: 'RETAIL_FEATURE', value: 'false', type: 'BOOLEAN' },
    ]);
  });

  it('updates a boolean configuration and records who changed it', async () => {
    const store = memoryStore([row()]);
    const service = createConfigurationService(store);

    await service.update(1, 'true', 9);

    expect(store.rows[0]).toMatchObject({
      configValue: 'true',
      updatedBy: 9,
    });
  });

  it('rejects a value that does not match the stored type', async () => {
    const service = createConfigurationService(memoryStore([row()]));

    await expect(service.update(1, 'yes', 9)).rejects.toMatchObject({
      code: 1009,
      message: 'Invalid request',
    });
  });

  it('uses the Java not-found code and message', async () => {
    const service = createConfigurationService(memoryStore([]));

    await expect(service.update(4, 'true', 9)).rejects.toBeInstanceOf(AppError);
    await expect(service.update(4, 'true', 9)).rejects.toMatchObject({
      code: 1035,
      message: 'Configuration not found with id: 4',
    });
  });
});
