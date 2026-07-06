import { z } from 'zod';

const regexRuleSchema = z.object({
  id: z.string().min(1),
  pattern: z.string().min(1),
  flags: z.string().optional(),
  score: z.number().int().optional(),
  target: z.enum(['url', 'message']).optional(),
});

const channelRuleSchema = z.object({
  channelId: z.string().min(1),
  mode: z.enum(['exempt', 'log', 'warn', 'delete', 'timeout']),
});

export const policyConfigFileSchema = z.object({
  enabled: z.boolean().default(true),
  mode: z.enum(['log', 'warn', 'delete', 'timeout']).default('log'),
  channelRules: z.array(channelRuleSchema).default([]),
  bypassRoleIds: z.array(z.string()).default([]),
  bypassUserIds: z.array(z.string()).default([]),
  domainAllowlist: z.array(z.string()).default([]),
  domainBlocklist: z.array(z.string()).default([]),
  knownPhishingDomains: z.array(z.string()).default([]),
  inviteAllowlist: z.array(z.string()).default([]),
  blockAllInvites: z.boolean().default(false),
  regexRules: z.array(regexRuleSchema).default([]),
  urlShortenerDomains: z.array(z.string()).optional(),
  requireAllowlist: z.boolean().default(false),
  flagUnknownDomains: z.boolean().default(false),
  massMentionThreshold: z.number().int().min(0).default(0),
});

export type PolicyConfigFile = z.infer<typeof policyConfigFileSchema>;

export const DEFAULT_POLICY_CONFIG: PolicyConfigFile = policyConfigFileSchema.parse({});

export const EXAMPLE_POLICY_CONFIG: PolicyConfigFile = policyConfigFileSchema.parse({
  enabled: true,
  mode: 'log',
  domainBlocklist: [],
  domainAllowlist: [],
  flagUnknownDomains: false,
});
