export default () => ({
  port: parseInt(process.env.API_PORT ?? "3001", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",

  supabase: {
    url: process.env.SUPABASE_URL ?? "",
    anonKey: process.env.SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  },

  aws: {
    region: process.env.AWS_REGION ?? "ap-southeast-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "localstack",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "localstack",
    s3Bucket: process.env.AWS_S3_BUCKET ?? "farmlink-media",
    endpointUrl: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566",
  },

  aiEngine: {
    url: process.env.AI_ENGINE_URL ?? "http://localhost:8000",
  },
});
