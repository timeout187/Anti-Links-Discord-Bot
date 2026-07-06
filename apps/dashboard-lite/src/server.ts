import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { StorageAdapter } from '@antilink-guard/storage';
import { createDefaultGuildConfig } from '@antilink-guard/storage';

const currentDir = dirname(fileURLToPath(import.meta.url));
const INDEX_HTML_PATH = join(currentDir, '..', 'public', 'index.html');

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function handleGuildResource(
  storage: StorageAdapter,
  guildId: string,
  resource: string,
  searchParams: URLSearchParams,
  res: ServerResponse,
): Promise<boolean> {
  if (resource === 'status') {
    const [guildConfig, allowlist, blocklist, inviteRules, recentAudit] = await Promise.all([
      storage.getGuildConfig(guildId),
      storage.listAllowlistEntries(guildId),
      storage.listBlocklistEntries(guildId),
      storage.listInviteRules(guildId),
      storage.listAuditLogEntries(guildId, { limit: 1 }),
    ]);
    sendJson(res, 200, {
      guildConfig: guildConfig ?? createDefaultGuildConfig(guildId),
      counts: {
        allowlist: allowlist.length,
        blocklist: blocklist.length,
        inviteRules: inviteRules.length,
      },
      lastAuditAt: recentAudit[0]?.createdAt ?? null,
    });
    return true;
  }

  if (resource === 'config') {
    const config = (await storage.getGuildConfig(guildId)) ?? createDefaultGuildConfig(guildId);
    sendJson(res, 200, config);
    return true;
  }

  if (resource === 'allowlist') {
    sendJson(res, 200, await storage.listAllowlistEntries(guildId));
    return true;
  }

  if (resource === 'blocklist') {
    sendJson(res, 200, await storage.listBlocklistEntries(guildId));
    return true;
  }

  if (resource === 'audit-logs') {
    const limit = Number(searchParams.get('limit') ?? '50');
    sendJson(res, 200, await storage.listAuditLogEntries(guildId, { limit }));
    return true;
  }

  return false;
}

export function createDashboardServer(storage: StorageAdapter): Server {
  return createServer((req: IncomingMessage, res: ServerResponse) => {
    void (async () => {
      try {
        const url = new URL(req.url ?? '/', 'http://localhost');

        if (req.method === 'GET' && url.pathname === '/') {
          const html = await readFile(INDEX_HTML_PATH, 'utf8');
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(html);
          return;
        }

        const parts = url.pathname.split('/').filter(Boolean);
        if (
          req.method === 'GET' &&
          parts[0] === 'api' &&
          parts[1] === 'guild' &&
          parts[2] &&
          parts[3]
        ) {
          const guildId = decodeURIComponent(parts[2]);
          const handled = await handleGuildResource(
            storage,
            guildId,
            parts[3],
            url.searchParams,
            res,
          );
          if (handled) return;
        }

        sendJson(res, 404, { error: 'Not found' });
      } catch (error) {
        sendJson(res, 500, { error: error instanceof Error ? error.message : 'Internal error' });
      }
    })();
  });
}
