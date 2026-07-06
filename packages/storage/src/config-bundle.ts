import { z } from 'zod';
import type {
  AllowlistEntry,
  BlocklistEntry,
  GuildConfig,
  InviteRule,
  StorageAdapter,
} from './types.js';
import { createDefaultGuildConfig } from './types.js';

export const CONFIG_BUNDLE_VERSION = 1 as const;

const enforcementModeSchema = z.enum(['log', 'warn', 'delete', 'timeout']);

const guildConfigSchema = z.object({
  guildId: z.string().min(1),
  enabled: z.boolean(),
  mode: enforcementModeSchema,
  logChannelId: z.string().optional(),
  bypassRoleIds: z.array(z.string()),
  bypassUserIds: z.array(z.string()),
  blockAllInvites: z.boolean(),
  requireAllowlist: z.boolean(),
  flagUnknownDomains: z.boolean(),
  massMentionThreshold: z.number().int().min(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const allowlistEntrySchema = z.object({
  id: z.string().min(1),
  guildId: z.string().min(1),
  domain: z.string().min(1),
  addedBy: z.string().min(1),
  createdAt: z.coerce.date(),
});

const blocklistEntrySchema = z.object({
  id: z.string().min(1),
  guildId: z.string().min(1),
  domain: z.string().min(1),
  addedBy: z.string().min(1),
  reason: z.string().optional(),
  createdAt: z.coerce.date(),
});

const inviteRuleSchema = z.object({
  id: z.string().min(1),
  guildId: z.string().min(1),
  inviteCode: z.string().min(1),
  addedBy: z.string().min(1),
  createdAt: z.coerce.date(),
});

export const configBundleSchema = z.object({
  version: z.literal(CONFIG_BUNDLE_VERSION),
  guildConfig: guildConfigSchema,
  allowlist: z.array(allowlistEntrySchema),
  blocklist: z.array(blocklistEntrySchema),
  inviteRules: z.array(inviteRuleSchema),
});

export interface ConfigBundle {
  version: typeof CONFIG_BUNDLE_VERSION;
  guildConfig: GuildConfig;
  allowlist: AllowlistEntry[];
  blocklist: BlocklistEntry[];
  inviteRules: InviteRule[];
}

export async function exportGuildConfigBundle(
  adapter: StorageAdapter,
  guildId: string,
): Promise<ConfigBundle> {
  const [guildConfig, allowlist, blocklist, inviteRules] = await Promise.all([
    adapter.getGuildConfig(guildId),
    adapter.listAllowlistEntries(guildId),
    adapter.listBlocklistEntries(guildId),
    adapter.listInviteRules(guildId),
  ]);

  return {
    version: CONFIG_BUNDLE_VERSION,
    guildConfig: guildConfig ?? createDefaultGuildConfig(guildId),
    allowlist,
    blocklist,
    inviteRules,
  };
}

export interface ImportConfigBundleOptions {
  /** Remove existing allowlist/blocklist/invite entries for this guild before importing. Defaults to true. */
  replaceExisting?: boolean;
}

export async function importGuildConfigBundle(
  adapter: StorageAdapter,
  bundle: ConfigBundle,
  options: ImportConfigBundleOptions = {},
): Promise<void> {
  const replaceExisting = options.replaceExisting ?? true;
  const { guildId } = bundle.guildConfig;

  if (replaceExisting) {
    const [existingAllowlist, existingBlocklist, existingInviteRules] = await Promise.all([
      adapter.listAllowlistEntries(guildId),
      adapter.listBlocklistEntries(guildId),
      adapter.listInviteRules(guildId),
    ]);
    await Promise.all([
      ...existingAllowlist.map((e) => adapter.removeAllowlistEntry(guildId, e.id)),
      ...existingBlocklist.map((e) => adapter.removeBlocklistEntry(guildId, e.id)),
      ...existingInviteRules.map((e) => adapter.removeInviteRule(guildId, e.id)),
    ]);
  }

  await adapter.upsertGuildConfig(bundle.guildConfig);
  await Promise.all([
    ...bundle.allowlist.map((e) => adapter.addAllowlistEntry(e)),
    ...bundle.blocklist.map((e) => adapter.addBlocklistEntry(e)),
    ...bundle.inviteRules.map((e) => adapter.addInviteRule(e)),
  ]);
}

export function parseConfigBundle(json: unknown): ConfigBundle {
  return configBundleSchema.parse(json);
}
