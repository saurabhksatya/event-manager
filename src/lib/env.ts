function assertEnvVariable(key: string) {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return process.env[key] as string;
}

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: assertEnvVariable("DATABASE_URL"),
  BETTER_AUTH_SECRET: assertEnvVariable("BETTER_AUTH_SECRET"),
  BETTER_AUTH_URL: assertEnvVariable("BETTER_AUTH_URL"),
  GOOGLE_CLIENT_ID: assertEnvVariable("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: assertEnvVariable("GOOGLE_CLIENT_SECRET"),
};

export default env;
