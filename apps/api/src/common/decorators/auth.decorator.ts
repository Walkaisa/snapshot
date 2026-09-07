import { createParamDecorator, type ExecutionContext, SetMetadata } from "@nestjs/common";
import type { AuthAdmin } from "../../modules/auth/auth.types.js";

export const IS_PUBLIC_KEY = "auth:public";

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const CurrentAdmin = createParamDecorator(
	(_data: unknown, context: ExecutionContext): AuthAdmin | undefined => context.switchToHttp().getRequest<{ user?: AuthAdmin }>().user,
);
