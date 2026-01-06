import { Body, Controller, HttpCode, HttpStatus, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RequestPasswordResetDto } from "./dto/request-password-reset.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ResendVerificationDto } from "./dto/resend-verification.dto";
import { ValidateInviteCodeDto } from "./dto/validate-invite-code.dto";
import { Public } from "./decorators/public.decorator";

@Controller("auth")
@Public() // All auth endpoints are public
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("validate-invite-code")
  async validateInviteCode(@Body() dto: ValidateInviteCodeDto) {
    return this.authService.validateInviteCode(dto.code);
  }

  @Post("verification/resend")
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Post("verify-email")
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post("login")
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, this.extractMetadata(req));
  }

  @Post("refresh")
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refreshTokens(dto, this.extractMetadata(req));
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto);
  }

  @Post("password/request-reset")
  async requestReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post("password/reset")
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  private extractMetadata(req: Request) {
    const forwardedFor = req.headers["x-forwarded-for"];
    const ipCandidate = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(",")[0];

    return {
      ipAddress: ipCandidate?.trim() || req.ip,
      userAgent: req.headers["user-agent"] ?? "unknown"
    };
  }
}
