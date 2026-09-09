import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): any => {
    return ctx.switchToHttp().getRequest().user;
  },
);
