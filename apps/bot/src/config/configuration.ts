export default () => ({
  port: parseInt(process.env.BOT_PORT ?? "3000", 10),
  webhookPath: process.env.WEBHOOK_PATH ?? "/webhook",
  publicUrl: process.env.PUBLIC_URL ?? "http://localhost:3000",

  line: {
    channelId: process.env.LINE_CHANNEL_ID ?? "mock-channel-id",
    channelSecret: process.env.LINE_CHANNEL_SECRET ?? "mock-channel-secret",
    channelAccessToken:
      process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "mock-access-token",
    liffId: process.env.LINE_LIFF_ID ?? "mock-liff-id",
    // Disable mock mode by setting LINE_MOCK_MODE=false in production
    mockMode: process.env.LINE_MOCK_MODE !== "false",
  },

  supabase: {
    url: process.env.SUPABASE_URL ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  },

  api: {
    url: process.env.API_URL ?? "http://localhost:3001",
  },

  liff: {
    url: process.env.LIFF_URL ?? "http://localhost:3002",
  },
});
