import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { UserRole } from "@prisma/client";
import { loginSchema } from "@/lib/validations";
import { prisma } from "@/lib/db";
import { getLogger } from "@/lib/logger";
import { verifyPassword } from "@/lib/password";
import { getRequestMetadataFromHeaders } from "@/lib/request-context";
import { writeAuditLog } from "@/lib/audit-log";
import { sendWelcomeEmail } from "@/lib/email-templates";

const authLogger = getLogger("auth");
const MAX_FAILED_LOGIN_ATTEMPTS = Number(process.env.AUTH_MAX_FAILED_LOGIN_ATTEMPTS ?? 5);
const LOCKOUT_MINUTES = Number(process.env.AUTH_LOCKOUT_MINUTES ?? 15);

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials, request) => {
        const requestMetadata = request ? getRequestMetadataFromHeaders(request.headers) : undefined;
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase().trim();

        try {
          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user || user.deletedAt) {
            await writeAuditLog({
              event: "authn_login_fail",
              category: "auth",
              level: "warn",
              actorEmail: email,
              ipAddress: requestMetadata?.ipAddress,
              userAgent: requestMetadata?.userAgent,
              requestId: requestMetadata?.requestId,
              metadata: { provider: "credentials", reason: "invalid_credentials" },
            });
            return null;
          }

          if (!user.passwordHash) {
            await writeAuditLog({
              event: "authn_login_fail",
              category: "auth",
              level: "warn",
              actorEmail: email,
              ipAddress: requestMetadata?.ipAddress,
              userAgent: requestMetadata?.userAgent,
              requestId: requestMetadata?.requestId,
              metadata: { provider: "credentials", reason: "invalid_credentials" },
            });
            return null;
          }

          if (user.lockedUntil && user.lockedUntil > new Date()) {
            await writeAuditLog({
              event: "authn_login_lock",
              category: "auth",
              level: "critical",
              actorUserId: user.id,
              actorEmail: email,
              ipAddress: requestMetadata?.ipAddress,
              userAgent: requestMetadata?.userAgent,
              requestId: requestMetadata?.requestId,
              targetType: "User",
              targetId: user.id,
              metadata: { provider: "credentials", reason: "locked", lockedUntil: user.lockedUntil.toISOString() },
            });
            return null;
          }

          const passwordMatches = await verifyPassword(user.passwordHash, parsed.data.password);

          if (!passwordMatches) {
            const failedLoginCount = user.failedLoginCount + 1;
            const shouldLock = failedLoginCount >= MAX_FAILED_LOGIN_ATTEMPTS;
            const lockedUntil = shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null;

            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedLoginCount,
                lockedUntil,
              },
            });

            await writeAuditLog({
              event: shouldLock ? "authn_login_lock" : "authn_login_fail",
              category: "auth",
              level: shouldLock ? "critical" : "warn",
              actorUserId: user.id,
              actorEmail: email,
              ipAddress: requestMetadata?.ipAddress,
              userAgent: requestMetadata?.userAgent,
              requestId: requestMetadata?.requestId,
              targetType: "User",
              targetId: user.id,
              metadata: {
                provider: "credentials",
                failedLoginCount,
                maxFailedLoginAttempts: MAX_FAILED_LOGIN_ATTEMPTS,
                lockedUntil: lockedUntil?.toISOString(),
              },
            });
            return null;
          }

          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: 0,
              lockedUntil: null,
              lastLoginAt: new Date(),
            },
          });

          await writeAuditLog({
            event: user.failedLoginCount > 0 ? "authn_login_success_after_fail" : "authn_login_success",
            category: "auth",
            level: "info",
            actorUserId: user.id,
            actorEmail: email,
            ipAddress: requestMetadata?.ipAddress,
            userAgent: requestMetadata?.userAgent,
            requestId: requestMetadata?.requestId,
            targetType: "User",
            targetId: user.id,
            metadata: { provider: "credentials" },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            sessionVersion: user.sessionVersion,
          };
        } catch (error) {
          authLogger.error({ err: error, email }, "Credentials authorize failed");
          await writeAuditLog({
            event: "authn_login_error",
            category: "auth",
            level: "error",
            actorEmail: email,
            ipAddress: requestMetadata?.ipAddress,
            userAgent: requestMetadata?.userAgent,
            requestId: requestMetadata?.requestId,
            metadata: { provider: "credentials" },
          });
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!account || account.provider === "credentials") return true;

      const email = user.email?.toLowerCase().trim();
      if (!email) return true;

      const existingUser = await prisma.user.findUnique({
        where: { email },
        include: { accounts: { select: { provider: true, providerAccountId: true } } },
      });

      if (!existingUser) return true;

      if (existingUser.deletedAt) {
        authLogger.warn({ email }, "Blocked OAuth sign-in for deleted account");
        return "/login?error=AccountDeleted";
      }

      const alreadyLinked = existingUser.accounts.some(
        (a) => a.provider === account.provider && a.providerAccountId === account.providerAccountId
      );

      if (alreadyLinked) return true;

      authLogger.warn(
        { email, provider: account.provider, existingUserId: existingUser.id },
        "Blocked OAuth sign-in for email with an existing unlinked account"
      );

      return "/login?error=OAuthAccountNotLinked";
    },
    async jwt({ token, user }) {
      const userId = user?.id ?? token.sub;
      if (!userId) return null;
      const freshUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, deletedAt: true, sessionVersion: true },
      });
      if (!freshUser || freshUser.deletedAt) return null;
      if (user?.sessionVersion !== undefined && user.sessionVersion !== freshUser.sessionVersion) return null;
      if (!user && (token.sessionVersion ?? 0) !== freshUser.sessionVersion) return null;
      token.sessionVersion = freshUser.sessionVersion;
      token.role = freshUser.role;

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (typeof token.role === "string" ? token.role : "musician") as UserRole;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.email) {
        await sendWelcomeEmail(
          { email: user.email, name: user.name ?? undefined }
        ).catch((error) => authLogger.error({ err: error }, "OAuth welcome email failed"));
      }
    },
    async signIn({ user, account, isNewUser }) {
      if (account?.provider === "credentials") return;

      await writeAuditLog({
        event: isNewUser ? "authn_register_success" : "authn_login_success",
        category: "auth",
        level: "info",
        actorUserId: user.id,
        actorEmail: user.email ?? undefined,
        targetType: "User",
        targetId: user.id,
        metadata: { provider: account?.provider ?? "unknown", oauth: true },
      });
    },
  },
  logger: {
    error(code, ...message) {
      authLogger.error({ code, message }, "Auth.js error");
    },
    warn(code, ...message) {
      authLogger.warn({ code, message }, "Auth.js warning");
    },
    debug(code, ...message) {
      authLogger.debug({ code, message }, "Auth.js debug");
    },
  },
});
