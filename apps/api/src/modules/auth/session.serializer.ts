import { Injectable } from "@nestjs/common";
import { PassportSerializer } from "@nestjs/passport";

import { AuthService } from "./auth.service.js";
import type { AuthAdmin } from "./auth.types.js";

@Injectable()
export class SessionSerializer extends PassportSerializer {
	constructor(private readonly auth: AuthService) {
		super();
	}

	serializeUser(admin: AuthAdmin, done: (err: unknown, id?: string) => void): void {
		done(null, admin.id);
	}

	async deserializeUser(id: string, done: (err: unknown, admin?: AuthAdmin | null) => void): Promise<void> {
		try {
			done(null, await this.auth.findById(id));
		} catch (error) {
			done(error);
		}
	}
}
