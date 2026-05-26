import { Module } from "@nestjs/common";
import { LineController } from "./line.controller";
import { LineService } from "./line.service";
import { SessionService } from "./session.service";
import { MessageHandler } from "./handlers/message.handler";
import { FollowHandler } from "./handlers/follow.handler";
import { PostbackHandler } from "./handlers/postback.handler";
import { OnboardingFlow } from "./flows/onboarding.flow";
import { SurveyFlow } from "./flows/survey.flow";
import { PhotoFlow } from "./flows/photo.flow";

@Module({
  controllers: [LineController],
  providers: [
    LineService,
    SessionService,
    MessageHandler,
    FollowHandler,
    PostbackHandler,
    OnboardingFlow,
    SurveyFlow,
    PhotoFlow,
  ],
  exports: [LineService],
})
export class LineModule {}
