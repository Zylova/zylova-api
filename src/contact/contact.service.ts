import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';
import { CreateContactSubmissionDto } from './dto/contact.dto';
import { EventsGateway } from '../events/events.gateway';
import { sanitize, sanitizeOptional } from '../common/utils/sanitizer';

@Injectable()
export class ContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly events: EventsGateway,
  ) {}

  async submit(dto: CreateContactSubmissionDto) {
    const submission = await this.prisma.contactSubmission.create({
      data: {
        name: sanitize(dto.name),
        email: sanitize(dto.email),
        company: sanitizeOptional(dto.company),
        service: sanitizeOptional(dto.service),
        message: sanitize(dto.message),
        status: 'unread',
      },
    });

    this.events.notifyNewContact(submission);
    await this.sendEmailNotification(dto).catch(() => {});

    return submission;
  }

  findAll() {
    return this.prisma.contactSubmission.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: string) {
    const contact = await this.prisma.contactSubmission.findUnique({
      where: { id },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return this.prisma.contactSubmission.update({
      where: { id },
      data: { status },
    });
  }

  private async sendEmailNotification(dto: CreateContactSubmissionDto) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const to = this.config.get<string>('CONTACT_EMAIL');

    if (!host || !user || !pass) return;

    const transporter = nodemailer.createTransport({
      host,
      port,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `"Zylova Contact" <${user}>`,
      to,
      subject: `New Contact from ${dto.name}`,
      html: `
        <h2>New Contact Submission</h2>
        <p><strong>Name:</strong> ${dto.name}</p>
        <p><strong>Email:</strong> ${dto.email}</p>
        <p><strong>Company:</strong> ${dto.company || 'N/A'}</p>
        <p><strong>Service:</strong> ${dto.service || 'N/A'}</p>
        <p><strong>Message:</strong></p>
        <p>${dto.message}</p>
      `,
    });
  }
}
