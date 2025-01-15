import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  [x: string]: any;
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // Sign up new user
  async register(email: string, password: string) {
    // Check if email exists
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    const hashed = await bcrypt.hash(password, 10);
    const newUser = await this.prisma.user.create({
      data: {
        email,
        password: hashed,
      },
    });
    return newUser;
  }

  // Validate user for login
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    return user;
  }

  async setResetToken(email: string, token: string, expiry: Date) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    return this.prisma.user.update({
      where: { email },
      data: {
        resetToken: token,
        resetTokenExpiry: expiry,
      },
    });
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gte: new Date(), // not expired yet
        },
      },
    });

    if (!user) {
      return null; // token invalid or expired
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    // Clear reset token & update password
    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });
  }

  async login(user: any) {
    const payload = { sub: user.id, email: user.email };
    const token = await this.jwtService.signAsync(payload);

    return {
      access_token: token,
    };
  }
}
