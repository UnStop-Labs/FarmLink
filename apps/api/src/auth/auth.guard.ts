import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { getAnonClient } from "@farmlink/database";
import type { Request } from "express";

// ============================================================
// Supabase Auth Guard
//
// Validates the Bearer JWT issued by Supabase Auth.
// Attaches the decoded user to request.user for use in controllers.
//
// In development (NODE_ENV !== 'production'), requests with the
// header X-Dev-User-Id bypass JWT verification so you can test
// without a real Supabase session.
// ============================================================

export interface AuthenticatedUser {
  id: string;
  email?: string;
  line_user_id?: string;
}

declare module "express" {
  interface Request {
    user?: AuthenticatedUser;
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly isDev: boolean;

  constructor(private readonly config: ConfigService) {
    this.isDev = config.get("nodeEnv") !== "production";
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    // Dev shortcut: pass X-Dev-User-Id header to skip JWT
    if (this.isDev && req.headers["x-dev-user-id"]) {
      req.user = { id: req.headers["x-dev-user-id"] as string };
      return true;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing Bearer token");
    }

    const token = authHeader.slice(7);

    try {
      const supabase = getAnonClient();
      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data.user) {
        throw new UnauthorizedException("Invalid or expired token");
      }

      req.user = {
        id: data.user.id,
        email: data.user.email,
      };

      return true;
    } catch (err) {
      this.logger.warn(`Auth failed: ${err}`);
      throw new UnauthorizedException("Authentication failed");
    }
  }
}
