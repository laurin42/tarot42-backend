import { betterAuth, APIError, type BetterAuthOptions } from 'better-auth';
import nodemailer from 'nodemailer';
import { bearer } from "better-auth/plugins";

// Drizzle Adapter: Path as specified by user.
// User confirms this path is correct: "better-auth/adapters/drizzle"
import { drizzleAdapter } from "better-auth/adapters/drizzle";

// Node.js/Express Integration: Path as specified by user, based on documentation.
// User confirms this path is correct for toNodeHandler: "better-auth/node"
import { toNodeHandler, fromNodeHeaders } from 'better-auth/node';

import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction as ExpressNextFunction } from 'express';
import { db } from './src/db';
import { user, session, account } from "./src/db/schema"; // Adjusted import path for schema items

// Startup Sanity Checks for critical imports
console.log("[Auth.ts Startup] Checking critical imports...");
if (typeof drizzleAdapter !== 'function') {
  console.error("CRITICAL STARTUP CHECK: drizzleAdapter from 'better-auth/adapters/drizzle' is NOT a function or not imported correctly. Value:", drizzleAdapter);
} else {
  console.log("[Auth.ts Startup] drizzleAdapter appears to be a function.");
}
if (typeof toNodeHandler !== 'function') {
  console.error("CRITICAL STARTUP CHECK: toNodeHandler from 'better-auth/node' is NOT a function or not imported correctly. Value:", toNodeHandler);
} else {
  console.log("[Auth.ts Startup] toNodeHandler appears to be a function.");
}
if (typeof fromNodeHeaders !== 'function') {
  console.error("CRITICAL STARTUP CHECK: fromNodeHeaders from 'better-auth/node' is NOT a function or not imported correctly. Value:", fromNodeHeaders);
} else {
  console.log("[Auth.ts Startup] fromNodeHeaders appears to be a function.");
}
console.log("[Auth.ts Startup] Finished checking critical imports.");

console.log(`[Auth.ts Startup] Current NODE_ENV: ${process.env.NODE_ENV}`);

const etherealHost = process.env.ETHEREAL_HOST;
const etherealPortString = process.env.ETHEREAL_PORT;
const etherealUser = process.env.ETHEREAL_USER;
const etherealPass = process.env.ETHEREAL_PASS;

let etherealPort = 587; // Default port
if (etherealPortString) {
    const parsedPort = parseInt(etherealPortString, 10);
    if (!isNaN(parsedPort)) {
        etherealPort = parsedPort;
    } else {
        console.warn(`Invalid ETHEREAL_PORT: ${etherealPortString}. Using default port 587.`);
    }
}

if (!etherealHost || !etherealUser || !etherealPass) {
    console.warn(
        "One or more Ethereal environment variables (ETHEREAL_HOST, ETHEREAL_USER, ETHEREAL_PASS) are not set. Email sending will likely fail for other email functions."
    );
}

export const auth: BetterAuthOptions = {
    database: drizzleAdapter(db, {
        provider: "pg",
    }),
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
    },
    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url, token }, request) => {
            if (!etherealHost || !etherealUser || !etherealPass) {
                console.error("Cannot send verification email: Ethereal SMTP configuration is missing or incomplete in environment variables.");
                return;
            }

            const transporter = nodemailer.createTransport({
                host: etherealHost,
                port: etherealPort,
                secure: etherealPort === 465,
                auth: {
                    user: etherealUser,
                    pass: etherealPass,
                },
            });

            const mailOptions = {
                from: '"Tarot42 App" <noreply@tarot42.dev>',
                to: user.email,
                subject: "Verify your email address for Tarot42",
                text: `Please click the following link to verify your email address: ${url}`,
                html: `<p>Please click the following link to verify your email address:</p><a href="${url}">${url}</a>`,
            };

            try {
                const info = await transporter.sendMail(mailOptions);
                console.log("Verification email sent: %s", info.messageId);
                console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
            } catch (error) {
                console.error("Error sending verification email:", error);
            }
        },
    },
    user: {
        deleteUser: {
            enabled: true,
            beforeDelete: async (user, request) => {
                console.log(`User ${user.email} (ID: ${user.id}) is about to be deleted.`);
            },
            afterDelete: async (user, request) => {
                console.log(`User ${user.email} (ID: ${user.id}) has been successfully deleted.`);
            },
        }
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_WEB_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_WEB_CLIENT_SECRET as string,
        },
    },
    basePath: "/api/auth",
    plugins: [
        bearer(),
    ],
    trustedOrigins: [
        "tarot42://",
        "http://localhost:8081",
        "http://192.168.2.187:8081",
        "http://192.168.178.67:8081",
    ]
};

// Corrected: Initialize using the named export 'betterAuth'
const authInstance = betterAuth(auth);

// The main auth handler for Express routes under /api/auth/*
// No custom token extraction needed here anymore. The bearer plugin should handle token responses.
const verySpecificAuthHandlerForBetterAuth = toNodeHandler(authInstance.handler);

// Custom Express Authentication Middleware (for protecting non-auth API routes)
export const authenticationMiddleware = async (
  req: ExpressRequest,
  res: ExpressResponse,
  next: ExpressNextFunction
) => {
  const requestUrl = new URL(req.originalUrl || req.url, `http://${req.headers.host}`);
  const method = req.method;
  const pathname = requestUrl.pathname;
  console.log(`[AuthMiddleware] Attempting to protect route: ${method} ${pathname}`);

  try {
    // Convert Express headers to Web API Headers.
    // The bearer plugin should make getSession look for the Authorization header.
    const webApiHeaders = fromNodeHeaders(req.headers as Record<string, string | string[]>);
    
    console.log(`[AuthMiddleware] Headers being passed to getSession (raw from fromNodeHeaders):`);
    webApiHeaders.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });

    // Call getSession. The bearer plugin should ensure this works with an Authorization: Bearer token.
    const sessionPayload = await authInstance.api.getSession({ headers: webApiHeaders });

    if (sessionPayload && sessionPayload.session) {
      console.log("[AuthMiddleware] Session valid. User:", sessionPayload.user?.email, "Session ID:", sessionPayload.session.id);
      req.user = sessionPayload.user || undefined;
      req.session = sessionPayload.session;
      console.log("[AuthMiddleware] req.user and req.session populated.");
      next();
    } else {
      console.log("[AuthMiddleware] Session invalid or not found by getSession. Unauthorized.");
      res.status(401).json({ message: "Unauthorized: No active session or token invalid" });
    }
  } catch (error: any) {
    console.error("[AuthMiddleware] Error during session validation:", error.message, error.stack);
    if (error instanceof APIError) {
      console.error(`[AuthMiddleware] APIError: Status ${error.status}, Message: ${error.message}`);
      const statusCode = typeof error.status === 'number' ? error.status : 500;
      res.status(statusCode).json({ message: error.message || "API Error during authentication" });
    } else {
      res.status(500).json({ message: "Internal server error during authentication check." });
    }
  }
};

export {
  authInstance,
  verySpecificAuthHandlerForBetterAuth,
  fromNodeHeaders,
  APIError,
  user,
  session,
  account,
};

  