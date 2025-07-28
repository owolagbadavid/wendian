import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { Template } from './models/template';

@Injectable()
export class MailSenderService {
  private transporter: nodemailer.Transporter;
  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('MAIL_HOST') as string,
      port: this.config.get('MAIL_PORT') as number,
      secure: false,
      auth: {
        user: this.config.get('MAIL_USER') as string,
        pass: this.config.get('MAIL_PASS') as string,
      },
    });
  }

  async sendMail<T = any>({
    sender,
    recipients,
    template,
    data,
  }: {
    recipients: string[];
    template: Template;
    sender?: string;
    data?: T;
  }) {
    try {
      sender = sender || (this.config.get('MAIL_FROM') as string);
      const subject = template.subject;
      let msg = template.body;

      Object.entries(data || {}).forEach(([key, value]) => {
        msg = msg.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      });

      const message = {
        from: sender,
        to: recipients,
        subject: subject,
        html: msg,
      };

      const shouldSend = this.config.get('SEND_EMAIL') === 'true';

      if (shouldSend) {
        await this.transporter.sendMail(message);
      }
    } catch (e) {
      console.log(e);
      throw new Error('Error sending email');
    }
  }
}
