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

  async sendOrderConfirmation(order: {
    email: string;
    downloadToken: string;
    items: Array<{ name: string; price: number }>;
    total: number;
    paymentMethod: string;
  }): Promise<void> {
    const itemsHtml = order.items
      .map(
        (item) =>
          `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;color:#333">${item.name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;color:#333;text-align:right">$${item.price.toFixed(2)}</td>
          </tr>`,
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f6;padding:24px 0">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:32px 24px;text-align:center">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">Thank You for Your Order!</h1>
              <p style="margin:8px 0 0;color:#d8b4fe;font-size:14px">Your digital products are on the way</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px">
              <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.5">Hi there,</p>
              <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.5">We're thrilled to confirm your purchase from <strong>Zylova Digital Agency</strong>. Below is your order summary.</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;margin-bottom:20px">
                <tr>
                  <td style="background-color:#f9fafb;padding:12px;border-bottom:1px solid #e0e0e0">
                    <h2 style="margin:0;font-size:14px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:0.5px">Order Summary</h2>
                  </td>
                </tr>
                ${itemsHtml}
                <tr>
                  <td style="padding:12px;text-align:right;font-size:16px;font-weight:700;color:#7c3aed">Total: $${order.total.toFixed(2)}</td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
                <tr>
                  <td style="padding:12px;background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;font-size:14px;color:#166534">
                    <strong>Payment Method:</strong> ${order.paymentMethod}
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0">
                    <a href="https://zylova-landing.vercel.app/download/${order.downloadToken}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px">Download Your Files</a>
                  </td>
                </tr>
              </table>

              <p style="margin:20px 0 0;color:#555;font-size:14px;line-height:1.5">Your download link is also your license key page — you'll find all license information when you access your files.</p>

              <hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0">

              <p style="margin:0;color:#555;font-size:13px;line-height:1.5">If you have any questions, feel free to reply to this email or contact us at <a href="mailto:${this.config.get<string>('CONTACT_EMAIL')}" style="color:#7c3aed">${this.config.get<string>('CONTACT_EMAIL')}</a>.</p>

              <p style="margin:16px 0 0;color:#888;font-size:12px;line-height:1.5">Zylova Digital Agency &mdash; Building digital experiences that matter.</p>
            </td>
          </tr>
        </table>

        <table role="presentation" width="560" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:16px 24px;text-align:center;font-size:11px;color:#999">
              &copy; ${new Date().getFullYear()} Zylova Digital Agency. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await this.send({ to: order.email, subject: 'Order Confirmation — Zylova Digital Agency', html });
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
