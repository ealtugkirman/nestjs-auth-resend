import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Res,
  // ...
} from '@nestjs/common';
// ...
import { ResendService } from 'src/common/mail/resend/resend.service';
import { randomBytes } from 'crypto';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly resendService: ResendService,
  ) {}

  // ... register & login endpoints from before

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes from now

    // Save token in DB
    const user = await this.authService.setResetToken(email, token, expires);
    if (!user) {
      // do nothing or throw error, up to you
      return {
        message: 'If that email is recognized, a reset link has been sent.',
      };
    }

    const resetLink = `https://localhost:3000/reset-password?token=${token}`;

    // Send email
    const htmlContent = `
      <p>Hello,</p>
      <p>You requested a password reset.</p>
      <p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 15 minutes.</p>
    `;
    await this.resendService.sendEmail(
      user.email,
      'Reset Your Password',
      htmlContent,
    );

    return { message: 'Reset link (if email is found) has been sent!' };
  }

  @Post('register')
  async register(@Body() body: { email: string; password: string }) {
    return this.authService.register(body.email, body.password);
  }

  @Post('reset-password')
  async resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    if (!token || !newPassword) {
      throw new BadRequestException('Token and new password are required');
    }

    const user = await this.authService.resetPassword(token, newPassword);
    if (!user) {
      throw new BadRequestException('Invalid or expired token');
    }

    return { message: 'Password updated successfully' };
  }

  @Post('login')
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const { access_token } = await this.authService.login(body);

    // HTTP-only cookie oluştur
    response.cookie('jwt', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 1 gün
    });

    return { message: 'Giriş başarılı' };
  }
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request) => {
          return request?.cookies?.jwt;
        },
      ]),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      email: payload.email,
    };
  }
}
