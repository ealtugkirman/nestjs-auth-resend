import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ResendService {
  private resend: Resend;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = new Resend(apiKey);
  }

  async sendEmail(to: string, subject: string, html: string) {
    try {
      const data = await this.resend.emails.send({
        from: 'noreply@digitalvoyage.agency', // Or your verified domain from Resend
        to,
        subject,
        html,
      });
      return data;
    } catch (error) {
      throw new Error('Failed to send email: ' + error.message);
    }
  }
}
