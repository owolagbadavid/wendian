import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';
import { MailSenderService } from './mail-sender.service';
import { MailProcessor } from './mail.processor';

@Module({
  controllers: [MailController],
  imports: [],
  providers: [MailService, MailSenderService, MailProcessor],
  exports: [MailService, MailProcessor],
})
export class MailModule {}
