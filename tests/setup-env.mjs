import { randomBytes } from "node:crypto";

// Never inherit real payment/email credentials in the regression suite.
process.env.STRIPE_SECRET_KEY = `sk_test_${randomBytes(24).toString("hex")}`;
process.env.AUTH_SECRET = randomBytes(32).toString("hex");
process.env.STRIPE_WEBHOOK_SECRET = randomBytes(32).toString("hex");
process.env.MAILJET_API_KEY = "";
process.env.MAILJET_API_SECRET = "";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://unused@127.0.0.1:1/stagelynk_test";
process.env.DIRECT_URL = process.env.DATABASE_URL;
