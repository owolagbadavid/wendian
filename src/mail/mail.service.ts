import { Injectable } from '@nestjs/common';

import { MailSenderService } from './mail-sender.service';
import { Template } from './models/template';

@Injectable()
export class MailService {
  constructor(private mailSender: MailSenderService) {}

  async sendVerificationEmail(data: {
    emailAddress: string;
    name: string;
    verificationOtp: string;
  }) {
    const name = data.name;
    const verificationOtp = data.verificationOtp;

    // todo: fetch template from a service or database
    const template = new Template();
    template.subject = 'Verify your email address';
    template.body = 'Your verification OTP is {{verificationOtp}}';

    await this.mailSender.sendMail({
      recipients: [data.emailAddress],
      template: template,
      data: { verificationOtp, name },
    });
  }

  async sendResetPasswordEmail(data: {
    emailAddress: string;
    name: string;
    resetOtp: string;
  }) {
    const name = data.name;
    const resetOtp = data.resetOtp;

    const template = new Template();
    template.subject = 'Reset your password';
    template.body = 'Your reset OTP is {{resetOtp}}';

    await this.mailSender.sendMail({
      recipients: [data.emailAddress],
      template: template,
      data: { resetOtp, name },
    });
  }
}
