import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  base: {
    app: "indiecentral",
    env: process.env.NODE_ENV ?? "development",
  },
  level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
  redact: {
    censor: "[REDACTED]",
    paths: [
      "password",
      "passwordHash",
      "*.password",
      "*.passwordHash",
      "token",
      "*.token",
      "accessToken",
      "*.accessToken",
      "refreshToken",
      "*.refreshToken",
      "access_token",
      "*.access_token",
      "refresh_token",
      "*.refresh_token",
      "id_token",
      "*.id_token",
      "authorization",
      "*.authorization",
      "cookie",
      "*.cookie",
      "req.headers.authorization",
      "req.headers.cookie",
      "headers.authorization",
      "headers.cookie",
      "paymentMethod",
      "*.paymentMethod",
      "card",
      "*.card",
    ],
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          ignore: "pid,hostname",
          translateTime: "SYS:standard",
        },
      },
});

export function getLogger(component: string) {
  return logger.child({ component });
}
