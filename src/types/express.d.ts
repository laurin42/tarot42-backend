import type { User, Session } from 'better-auth';

declare global {
  namespace Express {
    export interface Request {
      user?: User | null;
      session?: Session | null;
    }
  }
} 