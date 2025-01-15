// src/common/mail/mail.module.ts
import { Module } from '@nestjs/common';
import { ResendService } from './resend/resend.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [ResendService],
  exports: [ResendService],
})
export class MailModule {}
