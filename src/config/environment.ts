type Environment = Record<string, unknown>;

export interface AppEnvironment {
  DATABASE_URL: string;
  NODE_ENV: 'development' | 'test' | 'production';
  port: number;
  corsOrigins: string[];
  adminApiKey?: string;
  waselApiToken?: string;
  waselInstanceId?: string;
}

const DATABASE_URL_PATTERN = /^postgres(?:ql)?:\/\//i;

export function validateEnvironment(config: Environment): AppEnvironment {
  const databaseUrl = readRequiredString(config, 'DATABASE_URL');
  if (!DATABASE_URL_PATTERN.test(databaseUrl)) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection URL');
  }

  const nodeEnv = config.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(String(nodeEnv))) {
    throw new Error('NODE_ENV must be development, test, or production');
  }

  const port = Number(config.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  const nodeEnvValue = nodeEnv as AppEnvironment['NODE_ENV'];
  const adminApiKey = readOptionalString(config, 'ADMIN_API_KEY');

  if (nodeEnvValue === 'production' && !adminApiKey) {
    throw new Error('ADMIN_API_KEY is required in production');
  }

  return {
    DATABASE_URL: databaseUrl,
    NODE_ENV: nodeEnvValue,
    port,
    corsOrigins: String(config.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    adminApiKey,
    waselApiToken: readOptionalString(config, 'WASEL_API_TOKEN'),
    waselInstanceId: readOptionalString(config, 'WASEL_INSTANCE_ID'),
  };
}

function readRequiredString(config: Environment, key: string): string {
  const value = config[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${key} is required`);
  }
  return value.trim();
}

function readOptionalString(
  config: Environment,
  key: string,
): string | undefined {
  const value = config[key];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
