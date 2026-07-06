import { describe, expect, it, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadPolicyConfig } from '../src/load-policy.js';
import { DEFAULT_POLICY_CONFIG } from '../src/policy-config-schema.js';

describe('loadPolicyConfig', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  async function makeTempDir(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'antilink-cli-'));
    tempDirs.push(dir);
    return dir;
  }

  it('returns the default policy when no config file exists', async () => {
    const dir = await makeTempDir();
    const policy = await loadPolicyConfig(join(dir, 'missing.json'));
    expect(policy).toEqual(DEFAULT_POLICY_CONFIG);
  });

  it('loads and validates a config file that exists', async () => {
    const dir = await makeTempDir();
    const path = join(dir, 'antilink.config.json');
    await writeFile(
      path,
      JSON.stringify({ mode: 'delete', domainBlocklist: ['bad-site.com'] }),
      'utf8',
    );

    const policy = await loadPolicyConfig(path);
    expect(policy.mode).toBe('delete');
    expect(policy.domainBlocklist).toEqual(['bad-site.com']);
    expect(policy.enabled).toBe(true);
  });

  it('rejects a config file with an invalid mode', async () => {
    const dir = await makeTempDir();
    const path = join(dir, 'antilink.config.json');
    await writeFile(path, JSON.stringify({ mode: 'not-a-real-mode' }), 'utf8');

    await expect(loadPolicyConfig(path)).rejects.toThrow();
  });
});
