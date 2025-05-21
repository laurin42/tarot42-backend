import { betterAuth, type BetterAuthOptions, type User, type Session } from "better-auth";
import { expo } from "@better-auth/expo";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./src/db";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import nodemailer from "nodemailer";
import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import { APIError } from "better-auth/api";

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

const authOptions: BetterAuthOptions = {
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
        expo({
            overrideOrigin: true
        }
        ),
    ],
    trustedOrigins: [
        "tarot42://",
        "http://localhost:8081",
        "http://192.168.2.187:8081",
        "http://192.168.178.67:8081",
    ],
};

const authInstance = betterAuth(authOptions);
// console.log("[DEBUG auth.ts] Type of authInstance.handler:", typeof authInstance.handler);
// console.log("[DEBUG auth.ts] authInstance.handler itself:", authInstance.handler);

const originalHandler = authInstance.handler;

const loggingNodeHandler = toNodeHandler(async (request: Request) => {
  // const requestUrl = new URL(request.url);
  // const method = request.method;
  // const pathname = requestUrl.pathname;
  // const search = requestUrl.search;

  // console.log(`[AUTH_TS_HANDLER] Request: ${method} ${requestUrl.pathname}${search}`);
  // console.log(`[AUTH_TS_HANDLER] Headers:`, JSON.stringify(Object.fromEntries(request.headers.entries())));
  // if (method === "POST" || method === "PUT") {
  //   try {
  //     const bodyClone = request.clone();
  //     const bodyText = await bodyClone.text();
  //     console.log(`[AUTH_TS_HANDLER] Body: ${bodyText}`);
  //   } catch (e) {
  //     console.log("[AUTH_TS_HANDLER] Could not log body (possibly already read or not present).");
  //   }
  // }

  try {
    const response = await originalHandler(request);
    // const responseUrl = response.url ? new URL(response.url) : null;
    // console.log(`[AUTH_TS_HANDLER] Response Status: ${response.status}`);
    // console.log(`[AUTH_TS_HANDLER] Response Headers:`, JSON.stringify(Object.fromEntries(response.headers.entries())));
    // // Log body only for non-redirects and if content type is json
    // if (response.status < 300 || response.status >= 400) {
    //   const contentType = response.headers.get("content-type");
    //   if (contentType && contentType.includes("application/json")) {
    //     const responseBodyClone = response.clone();
    //     const responseBodyText = await responseBodyClone.text();
    //     console.log(`[AUTH_TS_HANDLER] Response Body: ${responseBodyText}`);
    //   }
    // }
    return response; // Ensure the response is returned
  } catch (error) {
    console.error("[AUTH_TS_HANDLER] Error during request handling:", error);
    // Re-throw the error to be handled by the default error handler or toNodeHandler's internal mechanisms
    throw error; 
  }
});

// Export the handler and other necessary parts
export const authNodeHandler = loggingNodeHandler;
export const authBaseFunctions = authInstance.api;

// Custom Express Authentication Middleware
export const authenticationMiddleware = async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  try {
    console.log("[AuthMiddleware] Checking session...");
    const requestHeaders = fromNodeHeaders(req.headers);

    const sessionData = await authInstance.api.getSession({
      headers: requestHeaders
    });

    if (sessionData && sessionData.user) {
      console.log(`[AuthMiddleware] Session valid for user: ${sessionData.user.id}`);
      req.user = sessionData.user;
      req.session = sessionData.session; 
      next();
    } else {
      console.log("[AuthMiddleware] No active session or user not found.");
      const err = new APIError(401, { code: "UNAUTHORIZED", message: "Authentication required." });
      const statusCode = typeof err.status === 'number' ? err.status : 401;
      // Fallback for code if not directly available
      res.status(statusCode).json({ error: err.message, code: (err as any).code || "UNAUTHORIZED" });
    }
  } catch (error: any) {
    console.error("[AuthMiddleware] Error during session check:", error);
    if (error instanceof APIError) {
      const statusCode = typeof error.status === 'number' ? error.status : 500;
      // Fallback for code if not directly available
      res.status(statusCode).json({ error: error.message, code: (error as any).code || "INTERNAL_SERVER_ERROR" });
    } else {
      // Fallback for unexpected errors
      res.status(500).json({ error: error.message || "Internal server error during authentication.", code: "INTERNAL_SERVER_ERROR" });
    }
  }
};

export default authInstance;
