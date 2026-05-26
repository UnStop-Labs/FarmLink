import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as line from "@line/bot-sdk";

// ============================================================
// LINE Service — wraps the @line/bot-sdk client
//
// MOCK MODE: When LINE_MOCK_MODE=true (default in dev), all
// send operations are logged instead of hitting the LINE API.
// Set LINE_MOCK_MODE=false and provide real credentials for
// production.
// ============================================================

export type FlexMessage = line.FlexMessage;
export type Message = line.Message;
export type TextMessage = line.TextMessage;
export type ImageMessage = line.ImageMessage;

@Injectable()
export class LineService {
  private readonly logger = new Logger(LineService.name);
  private client: line.messagingApi.MessagingApiClient | null = null;
  private readonly mockMode: boolean;

  constructor(private readonly config: ConfigService) {
    this.mockMode = config.get<boolean>("line.mockMode") ?? true;

    if (!this.mockMode) {
      this.client = new line.messagingApi.MessagingApiClient({
        channelAccessToken: config.get<string>("line.channelAccessToken")!,
      });
      this.logger.log("LINE client initialized (LIVE mode)");
    } else {
      this.logger.warn("LINE client running in MOCK mode — messages will be logged only");
    }
  }

  /** Verify LINE webhook signature */
  verifySignature(body: string | Buffer, signature: string): boolean {
    if (this.mockMode) return true;
    const secret = this.config.get<string>("line.channelSecret")!;
    return line.validateSignature(
      typeof body === "string" ? body : body.toString(),
      secret,
      signature
    );
  }

  /** Reply to an event using the reply token */
  async replyMessage(
    replyToken: string,
    messages: Message | Message[]
  ): Promise<void> {
    const messageArray = Array.isArray(messages) ? messages : [messages];

    if (this.mockMode) {
      this.logger.debug(
        `[MOCK] Reply to ${replyToken}:\n${JSON.stringify(messageArray, null, 2)}`
      );
      return;
    }

    try {
      await this.client!.replyMessage({
        replyToken,
        messages: messageArray as line.Message[],
      });
    } catch (err) {
      this.logger.error(`Failed to reply message: ${err}`);
      throw err;
    }
  }

  /** Push a message to a user (not reply — can be triggered anytime) */
  async pushMessage(userId: string, messages: Message | Message[]): Promise<void> {
    const messageArray = Array.isArray(messages) ? messages : [messages];

    if (this.mockMode) {
      this.logger.debug(
        `[MOCK] Push to ${userId}:\n${JSON.stringify(messageArray, null, 2)}`
      );
      return;
    }

    try {
      await this.client!.pushMessage({
        to: userId,
        messages: messageArray as line.Message[],
      });
    } catch (err) {
      this.logger.error(`Failed to push message to ${userId}: ${err}`);
      throw err;
    }
  }

  /** Get user profile (display name, avatar) */
  async getUserProfile(userId: string): Promise<{
    displayName: string;
    pictureUrl?: string;
    language?: string;
  }> {
    if (this.mockMode) {
      return {
        displayName: `MockUser_${userId.slice(-4)}`,
        pictureUrl: undefined,
        language: "th",
      };
    }

    const profile = await this.client!.getProfile(userId);
    return {
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      language: profile.language,
    };
  }

  /** Set Rich Menu for a specific user */
  async linkRichMenuToUser(userId: string, richMenuId: string): Promise<void> {
    if (this.mockMode) {
      this.logger.debug(`[MOCK] Link rich menu ${richMenuId} to user ${userId}`);
      return;
    }
    await this.client!.linkRichMenuIdToUser(userId, richMenuId);
  }

  /** Get the LIFF URL for the mini app */
  getLiffUrl(path = ""): string {
    const liffId = this.config.get<string>("line.liffId");
    if (this.mockMode) {
      const liffUrl = this.config.get<string>("liff.url") ?? "http://localhost:3002";
      return `${liffUrl}${path}`;
    }
    return `https://liff.line.me/${liffId}${path}`;
  }

  /** Build a simple text message */
  textMessage(text: string): TextMessage {
    return { type: "text", text };
  }

  /** Build a quick reply button set */
  withQuickReplies(
    message: Message,
    items: Array<{ label: string; text?: string; data?: string }>
  ): Message {
    const quickReply: line.QuickReply = {
      items: items.map((item) =>
        item.data
          ? {
              type: "action",
              action: {
                type: "postback",
                label: item.label,
                data: item.data,
                displayText: item.label,
              },
            }
          : {
              type: "action",
              action: {
                type: "message",
                label: item.label,
                text: item.text ?? item.label,
              },
            }
      ),
    };

    return { ...message, quickReply } as Message;
  }
}
