import { asc, eq } from 'drizzle-orm';

import { getDb } from '../../db/client.js';
import { configurations } from '../../db/schema/configurations.js';

export type ConfigurationRow = typeof configurations.$inferSelect;

export const configurationsRepository = {
  async findAll(): Promise<ConfigurationRow[]> {
    return getDb().select().from(configurations).orderBy(asc(configurations.id));
  },

  async findByKey(key: string): Promise<ConfigurationRow | null> {
    const [row] = await getDb()
      .select()
      .from(configurations)
      .where(eq(configurations.configKey, key))
      .limit(1);
    return row ?? null;
  },

  async findById(id: number): Promise<ConfigurationRow | null> {
    const [row] = await getDb()
      .select()
      .from(configurations)
      .where(eq(configurations.id, id))
      .limit(1);
    return row ?? null;
  },

  async updateValue(id: number, value: string, updatedBy: number): Promise<void> {
    await getDb()
      .update(configurations)
      .set({
        configValue: value,
        updatedAt: new Date(),
        updatedBy,
      })
      .where(eq(configurations.id, id));
  },
};
