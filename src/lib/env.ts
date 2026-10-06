/**
 * Reads a server env var, trimmed. Values pasted into a hosting dashboard
 * often carry a stray space or newline, which silently breaks URLs and keys.
 * Empty counts as missing.
 */
export function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/** Like env(), but throws a clear configuration error when missing. */
export function requireEnv(name: string): string {
  const value = env(name);
  if (!value) throw new ConfigError(`${name} is not set`);
  return value;
}

export class ConfigError extends Error {}
