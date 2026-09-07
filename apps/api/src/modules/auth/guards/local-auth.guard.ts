import { type ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { loginRequestSchema } from "@snapshot/contracts";
import { ZodValidationException } from "nestjs-zod";

@Injectable()
export class LocalAuthGuard extends AuthGuard("local") {
	override async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<{ body: unknown }>();
		const parsed = loginRequestSchema.safeParse(request.body);

		if (!parsed.success) {
			throw new ZodValidationException(parsed.error);
		}

		request.body = parsed.data;
		return (await super.canActivate(context)) as boolean;
	}
}
