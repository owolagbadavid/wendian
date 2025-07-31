import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';
import { MailSenderService } from './mail-sender.service';
import { MailProcessor } from './mail.processor';

@Global()
@Module({
  controllers: [MailController],
  imports: [],
  providers: [MailService, MailSenderService, MailProcessor],
  exports: [MailService, MailProcessor, MailSenderService],
})
export class MailModule {}
