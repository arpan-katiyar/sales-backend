import { AppError } from '../../common/errors/app-error.js';
import type { ConfigurationRow } from './configurations.repository.js';
import { configurationsRepository } from './configurations.repository.js';

const CONFIGURATION_NOT_FOUND = 1035;
const INVALID_REQUEST = 1009;

export type ConfigurationResponse = {
  id: number;
  key: string;
  value: string | null;
  type: 'STRING' | 'INTEGER' | 'BOOLEAN';
};

type ConfigurationStore = Pick<
  typeof configurationsRepository,
  'findAll' | 'findById' | 'updateValue'
>;

export function isValidConfigurationValue(typeCode: number, value: string): boolean {
  if (typeCode === 0) {
    return true;
  }
  if (typeCode === 1) {
    if (!/^[+-]?\d+$/.test(value)) {
      return false;
    }
    const parsed = Number(value);
    return parsed >= -2147483648 && parsed <= 2147483647;
  }
  if (typeCode === 2) {
    const normalized = value.toLowerCase();
    return normalized === 'true' || normalized === 'false';
  }
  return false;
}

function typeName(typeCode: number): ConfigurationResponse['type'] {
  if (typeCode === 0) {
    return 'STRING';
  }
  if (typeCode === 1) {
    return 'INTEGER';
  }
  if (typeCode === 2) {
    return 'BOOLEAN';
  }
  throw new Error(`Unknown ConfigurationType code: ${typeCode}`);
}

function toResponse(row: ConfigurationRow): ConfigurationResponse {
  return {
    id: row.id,
    key: row.configKey,
    value: row.configValue,
    type: typeName(row.configType),
  };
}

export function createConfigurationService(store: ConfigurationStore) {
  return {
    async list(): Promise<ConfigurationResponse[]> {
      const rows = await store.findAll();
      return rows.map(toResponse);
    },

    async update(configurationId: number, value: string, updatedBy: number): Promise<void> {
      const configuration = await store.findById(configurationId);
      if (!configuration) {
        throw new AppError(
          CONFIGURATION_NOT_FOUND,
          `Configuration not found with id: ${configurationId}`,
          200,
        );
      }
      if (!isValidConfigurationValue(configuration.configType, value)) {
        throw new AppError(INVALID_REQUEST, 'Invalid request', 200);
      }
      await store.updateValue(configurationId, value, updatedBy);
    },
  };
}

export const configurationService = createConfigurationService(configurationsRepository);
