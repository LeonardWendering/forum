import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer, { type SendMailOptions, type Transporter } from "nodemailer";

@Injectable()
export class MailService {
  private readonly transporter: Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>("MAIL_HOST") || this.configService.get<string>("MAILHOG_HOST") || "localhost";
    const port = this.configService.get<number>("MAIL_PORT") || this.configService.get<number>("MAILHOG_PORT") || 1025;
    const user = this.configService.get<string>("MAIL_USER");
    const pass = this.configService.get<string>("MAIL_PASS");

    const config: nodemailer.TransportOptions = {
      host,
      port,
      secure: false
    } as nodemailer.TransportOptions;

    // Add auth if credentials are provided (for Gmail, etc.)
    if (user && pass && user !== "skip" && pass !== "skip") {
      (config as Record<string, unknown>).auth = { user, pass };
    }

    this.transporter = nodemailer.createTransport(config);
  }

  private async send(options: SendMailOptions) {
    const from = this.configService.getOrThrow<string>("MAIL_FROM_ADDRESS");
    const payload = {
      from,
      ...options
    };

    const result = await this.transporter.sendMail(payload);
    this.logger.log(`Email dispatched (messageId=${result.messageId}) to ${options.to}`);
  }

  async sendVerificationEmail(email: string, code: string) {
    const publicAppUrl = this.configService.getOrThrow<string>("PUBLIC_APP_URL");
    const verifyLink = `${publicAppUrl}/verify-email?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`;

    await this.send({
      to: email,
      subject: "Verify your email",
      text: `Welcome! Use code ${code} to verify your account or click ${verifyLink}`,
      html: `
        <p>Welcome to the forum!</p>
        <p>Use the code below to verify your email:</p>
        <h2>${code}</h2>
        <p>Or click <a href="${verifyLink}">this link</a>.</p>
      `
    });
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const publicAppUrl = this.configService.getOrThrow<string>("PUBLIC_APP_URL");
    const resetLink = `${publicAppUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

    await this.send({
      to: email,
      subject: "Password reset instructions",
      text: `Use the link to reset your password: ${resetLink}`,
      html: `
        <p>You requested a password reset.</p>
        <p><a href="${resetLink}">Reset your password</a></p>
        <p>If you did not request this, you can ignore this email.</p>
      `
    });
  }
}
