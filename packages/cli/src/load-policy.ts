import { readFile } from 'node:fs/promises';
import type { PolicyConfig } from '@antilink-guard/core';
import { DEFAULT_POLICY_CONFIG, policyConfigFileSchema } from './policy-config-schema.js';

export const DEFAULT_CONFIG_FILENAME = 'antilink.config.json';

function isEnoent(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}

export async function loadPolicyConfig(
  path: string = DEFAULT_CONFIG_FILENAME,
): Promise<PolicyConfig> {
  try {
    const raw = await readFile(path, 'utf8');
    return policyConfigFileSchema.parse(JSON.parse(raw));
  } catch (error) {
    if (isEnoent(error)) return DEFAULT_POLICY_CONFIG;
    throw error;
  }
}
