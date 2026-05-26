import { Injectable, Logger } from "@nestjs/common";
import { getServiceClient } from "@farmlink/database";

// ============================================================
// Session Service — persists bot conversation state in Supabase
// Uses the bot_sessions table so state survives restarts
// ============================================================

export interface SessionData {
  flow: string;
  step: string;
  data: Record<string, unknown>;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  async get(lineUserId: string): Promise<SessionData | null> {
    try {
      const db = getServiceClient();
      const { data, error } = await db
        .from("bot_sessions")
        .select("flow, step, data, expires_at")
        .eq("line_user_id", lineUserId)
        .single();

      if (error || !data) return null;

      // Check if session has expired
      if (new Date(data.expires_at) < new Date()) {
        await this.clear(lineUserId);
        return null;
      }

      return {
        flow: data.flow,
        step: data.step,
        data: data.data as Record<string, unknown>,
      };
    } catch {
      return null;
    }
  }

  async set(
    lineUserId: string,
    session: SessionData,
    ttlMinutes = 60
  ): Promise<void> {
    try {
      const db = getServiceClient();
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

      await db.from("bot_sessions").upsert(
        {
          line_user_id: lineUserId,
          flow: session.flow,
          step: session.step,
          data: session.data,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "line_user_id" }
      );
    } catch (err) {
      this.logger.error(`Failed to set session for ${lineUserId}: ${err}`);
    }
  }

  async update(
    lineUserId: string,
    updates: Partial<SessionData>
  ): Promise<void> {
    const current = await this.get(lineUserId);
    if (!current) return;

    await this.set(lineUserId, {
      flow: updates.flow ?? current.flow,
      step: updates.step ?? current.step,
      data: { ...current.data, ...(updates.data ?? {}) },
    });
  }

  async clear(lineUserId: string): Promise<void> {
    try {
      const db = getServiceClient();
      await db
        .from("bot_sessions")
        .delete()
        .eq("line_user_id", lineUserId);
    } catch (err) {
      this.logger.error(`Failed to clear session for ${lineUserId}: ${err}`);
    }
  }
}
