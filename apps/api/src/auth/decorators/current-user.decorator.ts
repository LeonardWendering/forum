import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { PublicUser } from "../auth.types";

export const CurrentUser = createParamDecorator(
  (data: keyof PublicUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as PublicUser;

    if (data) {
      return user?.[data];
    }

    return user;
  }
);
