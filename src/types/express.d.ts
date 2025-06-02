import type { User as BetterAuthUserType, Session as BetterAuthSessionType } from 'better-auth'; // Added Session import

// This should augment the global Express namespace
declare global {
  namespace Express {
    export interface Request {
      user?: BetterAuthUserType; // Use the imported User type from better-auth
      session?: BetterAuthSessionType; // Added session property
    }
  }
}

// Adding an empty export to make this a module, if it isn't already.
// This can sometimes help with global augmentation issues.
export {};