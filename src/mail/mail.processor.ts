import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from './mail.service';
import { Logger } from '@nestjs/common';
import { NotificationEnum } from './notification.enum';

@Processor('mail')
export class MailProcessor extends WorkerHost {
  private logger: Logger;
  constructor(private mailService: MailService) {
    super();
    this.logger = new Logger(MailProcessor.name);
  }

  async process(job: Job) {
    switch (job.name) {
      case NotificationEnum.VerificationEmail as string: {
        try {
          await this.mailService.sendVerificationEmail(job.data);
          this.logger.log('Verification email sent');
        } catch (error) {
          this.logger.error('Error sending verification email', error);
        }
        return;
      }
      case NotificationEnum.ResetPasswordEmail as string: {
        try {
          await this.mailService.sendResetPasswordEmail(job.data);
          this.logger.log('Reset password email sent');
        } catch (error) {
          this.logger.error('Error sending reset password email', error);
          throw error;
        }
        return;
      }
    }
  }
}
