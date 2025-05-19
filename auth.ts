import { betterAuth, type BetterAuthOptions } from "better-auth";
import { expo } from "@better-auth/expo";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./src/db";
import { toNodeHandler } from "better-auth/node";
import nodemailer from "nodemailer";


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
        "One or more Ethereal environment variables (ETHEREAL_HOST, ETHEREAL_USER, ETHEREAL_PASS) are not set. Email sending will likely fail."
    );
    throw new Error("Missing Ethereal SMTP configuration in environment variables.");
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
            // Check if Ethereal config is loaded before attempting to send
            if (!etherealHost || !etherealUser || !etherealPass) {
                console.error("Cannot send verification email: Ethereal SMTP configuration is missing or incomplete in environment variables.");
                // Potentially re-throw an error or handle this more gracefully
                // depending on your application's needs.
                return; 
            }

            const transporter = nodemailer.createTransport({
                host: etherealHost,
                port: etherealPort,
                secure: etherealPort === 465, // typically true if port is 465, false for 587 (TLS)
                auth: {
                    user: etherealUser,
                    pass: etherealPass,
                },
                // Adding a timeout for debugging purposes, if needed
                // connectionTimeout: 5 * 1000, // 5 seconds
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
    socialProviders: {
        google: { 
            clientId: process.env.GOOGLE_CLIENT_ID as string, 
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string, 
        },
    },
    basePath: "/api/auth",
    plugins: [expo()],
    trustedOrigins: [
        "tarot42://", // Für native Expo App
        "http://localhost:8081", // For web Dev
        "http://192.168.2.187:8081", // For mobile Dev 
    ],
};

const authInstance = betterAuth(authOptions);
// console.log("[DEBUG auth.ts] Type of authInstance.handler:", typeof authInstance.handler);
// console.log("[DEBUG auth.ts] authInstance.handler itself:", authInstance.handler);

const originalHandler = authInstance.handler;

const loggingNodeHandler = toNodeHandler(async (request) => {
  // const requestUrl = new URL(request.url);
  // const method = request.method;
  // const pathname = requestUrl.pathname;
  // const search = requestUrl.search;

  // console.log(`[AUTH_LOG_START] ${method} ${pathname}${search}`);

  // if (method === 'POST' && pathname.includes('sign-up/email')) {
  //   console.log(`[AUTH_LOG_SIGNUP_IF_ENTERED] Entered POST sign-up/email specific block.`);
  //   let rawBody = null;
  //   try {
  //     console.log(`[AUTH_LOG_SIGNUP_BEFORE_CLONE] About to clone request.`);
  //     const clonedRequestForText = request.clone();
  //     const clonedRequestForJson = request.clone(); 
  //     console.log(`[AUTH_LOG_SIGNUP_AFTER_CLONE] Request cloned successfully (x2).`);
  //     console.log(`[AUTH_LOG_SIGNUP_BEFORE_TEXT_PARSE] About to parse body as TEXT.`);
  //     rawBody = await clonedRequestForText.text(); 
  //     console.log(`[AUTH_LOG_SIGNUP_RAW_BODY] Raw request body as text: >>>${rawBody}<<<`);
  //     if (rawBody && rawBody.trim() !== "") {
  //       console.log(`[AUTH_LOG_SIGNUP_BEFORE_JSON_PARSE] About to parse (previously read) body as JSON.`);
  //       const body = await clonedRequestForJson.json(); 
  //       console.log(`[AUTH_LOG_SIGNUP_BODY] Attempting sign-up for: ${body.email}`);
  //     } else {
  //       console.warn(`[AUTH_LOG_WARN] Raw body was empty or whitespace. Skipping JSON parse.`);
  //     }
  //   } catch (e: any) {
  //     console.warn(`[AUTH_LOG_WARN] Error during body processing (rawBody: >>>${rawBody}<<<): ${e.message}`, e.stack);
  //   }
  //   console.log(`[AUTH_LOG_SIGNUP_IF_EXITED] Exited POST sign-up/email specific block.`);
  // } else if (method === 'POST') {
  //   console.log(`[AUTH_LOG_INFO] Received POST for ${pathname} - not sign-up/email.`);
  // }

  // let startTime: number = 0; 
  try {
    // console.log(`[AUTH_LOG_HANDLER_CALL] About to call original better-auth handler for ${method} ${pathname}`);
    // startTime = Date.now(); 

    const response = await originalHandler(request.clone()); 

    // const duration = Date.now() - startTime; 
    // console.log(`[AUTH_LOG_HANDLER_RETURN] Original better-auth handler returned for ${method} ${pathname}. Duration: ${duration}ms. Status: ${response.status}`);

    // if (!response.ok) {
    //     const responseBody = await response.clone().text(); 
    //     console.warn(`[AUTH_LOG_HANDLER_ERROR_RESPONSE] Error response body from handler: ${responseBody}`);
    // }
    return response;
  } catch (error: any) {
    // const duration = Date.now() - startTime; 
    // console.error(`[AUTH_LOG_HANDLER_FATAL_ERROR] Fatal error in original better-auth handler for ${method} ${pathname} after ${duration}ms:`, error.message, error.stack);
    // Fallback zu einer generischen Fehlermeldung, falls etwas im originalHandler crasht, bevor eine Response gesendet wird.
    // Dies ist ein Notfall-Fallback; idealerweise behandelt better-auth alle Fehler intern und gibt eine strukturierte Antwort.
    console.error("[BetterAuthWrapper] Unhandled error in originalHandler:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error during auth processing", message: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } 
  // finally {
  //   console.log(`[AUTH_LOG_END] ${method} ${pathname}${search} processing finished.`);
  // }
});

export default loggingNodeHandler;

export { authInstance as auth };