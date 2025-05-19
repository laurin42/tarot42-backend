import { betterAuth, type BetterAuthOptions } from "better-auth";
import { expo } from "@better-auth/expo";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./src/db";
import { toNodeHandler } from "better-auth/node";


const authOptions: BetterAuthOptions = {
    database: drizzleAdapter(db, {
        provider: "pg",
    }),
    emailAndPassword: {
        enabled: true,
    },
    basePath: "/api/auth",
    plugins: [expo()],
    trustedOrigins: [
        "tarot42://", // Für native Expo App
        "http://localhost:8081" // Für deine Web-App im Development
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