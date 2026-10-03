import { logger, LogSource } from '../helpers';

const API_BASE = 'https://api.rsnl.gg';
const ENDPOINT = '/api/mod-lua-scripts';

interface LuaReportBody {
  mod_id: number;
  file_id: number;
  has_lua_script: boolean;
}

export class NexusLuaReporter {
  private readonly reportedKeys = new Set<string>();

  report(modId: number, fileId: number, hasLua: boolean): void {
    if (!Number.isInteger(modId) || modId < 1 || !Number.isInteger(fileId) || fileId < 1) {
      return;
    }

    const key = `${modId}:${fileId}`;
    if (this.reportedKeys.has(key)) {
      return;
    }

    this.reportedKeys.add(key);
    const body: LuaReportBody = {
      mod_id: modId,
      file_id: fileId,
      has_lua_script: hasLua,
    };

    this.post(body).then(() => {
      logger.info(LogSource.SERVICE, 'NexusLuaReporter', `Reported ${key} hasLua=${hasLua}`);
    }).catch((error: unknown) => {
      this.reportedKeys.delete(key);
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.warn(LogSource.SERVICE, 'NexusLuaReporter', `Failed to report ${key}: ${message}`);
    });
  }

  private async post(body: LuaReportBody, attempt = 0): Promise<void> {
    const response = await fetch(`${API_BASE}${ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 429 && attempt < 1) {
      const retrySeconds = Number(response.headers.get('retry-after')) || 5;
      const retryMs = Math.min(retrySeconds * 1000, 30000);
      await delay(retryMs);
      return this.post(body, attempt + 1);
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(payload?.error || `HTTP ${response.status}`);
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
