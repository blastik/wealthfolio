const DEFAULT_CONNECT_API_URL = "https://api.wealthfolio.app";
const DEFAULT_CONNECT_AUTH_URL = "https://auth.wealthfolio.app";
const DEFAULT_CONNECT_AUTH_PUBLISHABLE_KEY = "sb_publishable_ZSZbXNtWtnh9i2nqJ2UL4A_NV8ZVutd";
const DEFAULT_CONNECT_OAUTH_CALLBACK_URL = "https://connect.wealthfolio.app/deeplink";

const resolveEnvValue = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const resolveUrlValue = (value: unknown) => resolveEnvValue(value).replace(/\/+$/, "");

export const CONNECT_API_URL =
  resolveUrlValue(import.meta.env.CONNECT_API_URL) || DEFAULT_CONNECT_API_URL;

export const CONNECT_AUTH_URL =
  resolveUrlValue(import.meta.env.CONNECT_AUTH_URL) || DEFAULT_CONNECT_AUTH_URL;

export const CONNECT_AUTH_PUBLISHABLE_KEY =
  resolveEnvValue(import.meta.env.CONNECT_AUTH_PUBLISHABLE_KEY) ||
  DEFAULT_CONNECT_AUTH_PUBLISHABLE_KEY;

export const CONNECT_OAUTH_CALLBACK_URL =
  resolveUrlValue(import.meta.env.CONNECT_OAUTH_CALLBACK_URL) || DEFAULT_CONNECT_OAUTH_CALLBACK_URL;

export const CONNECT_ENABLED = Boolean(CONNECT_AUTH_URL && CONNECT_AUTH_PUBLISHABLE_KEY);
