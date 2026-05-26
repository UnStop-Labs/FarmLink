import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  // Validation pipe for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    })
  );

  // LINE requires raw body for signature verification
  // This is handled per-route in the webhook controller

  const port = process.env.BOT_PORT ?? 3000;
  await app.listen(port);

  logger.log(`🤖 FarmLink LINE Bot running on http://localhost:${port}`);
  logger.log(`📡 Webhook endpoint: POST ${process.env.WEBHOOK_PATH ?? "/webhook"}`);
  logger.log(
    `🔗 Register webhook URL in LINE Developers Console: ${process.env.PUBLIC_URL ?? "http://localhost:" + port}${process.env.WEBHOOK_PATH ?? "/webhook"}`
  );
}

bootstrap();
