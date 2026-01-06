import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";

/**
 * Guard that verifies the user is a bot account (isBot=true)
 * Must be used after JwtAuthGuard to ensure user is authenticated
 */
@Injectable()
export class BotGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("Authentication required");
    }

    if (!user.isBot) {
      throw new ForbiddenException("This endpoint is only accessible to bot accounts");
    }

    return true;
  }
}
