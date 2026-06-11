import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: port || 587,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log('Email transporter configured');
    } else {
      this.logger.warn(
        'SMTP not configured — emails will be logged to console',
      );
    }
  }

  async send(dto: { to: string; subject: string; html: string }) {
    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: `"Zylova" <${this.config.get<string>('SMTP_USER')}>`,
          to: dto.to,
          subject: dto.subject,
          html: dto.html,
        });
        const messageId = String(info?.messageId ?? '');
        this.logger.log(`Email sent to ${dto.to}: ${messageId}`);
        return { sent: true, messageId };
      } catch (err) {
        this.logger.error(`Failed to send email to ${dto.to}`, err);
        return {
          sent: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    }

    this.logger.log(`[EMAIL] To: ${dto.to}, Subject: ${dto.subject}`);
    return { sent: false, logged: true };
  }
}
