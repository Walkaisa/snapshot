import { Inject, Injectable } from "@nestjs/common";
import type { CsrfSync } from "csrf-sync";
import type { Request } from "express";

import { AppConfigService } from "../../config/app-config.service.js";
import { CSRF, MFA_CHALLENGE_TTL_MS } from "./auth.constants.js";
import type { AuthAdmin } from "./auth.types.js";
import { SessionRegistryService } from "./session-registry.service.js";

function promisify(action: (done: (err?: unknown) => void) => void): Promise<void> {
	return new Promise((resolve, reject) => {
		action((err) => (err ? reject(err) : resolve()));
	});
}

const HOUR_MS = 60 * 60 * 1000;

export function absoluteSessionExpired(createdAt: string | undefined, absoluteTtlMs: number, now = Date.now()): boolean {
	const startedAt = Date.parse(createdAt ?? "");
	const age = now - startedAt;

	return !Number.isFinite(age) || age < 0 || age >= absoluteTtlMs;
}

@Injectable()
export class SessionManagerService {
	constructor(
		@Inject(CSRF) private readonly csrf: CsrfSync,
		private readonly registry: SessionRegistryService,
		private readonly config: AppConfigService,
	) {}

	async loginAndEstablish(request: Request, admin: AuthAdmin): Promise<string> {
		await promisify((done) => request.logIn(admin, done));
		return this.establish(request, admin);
	}

	async establish(request: Request, admin: AuthAdmin): Promise<string> {
		const now = new Date().toISOString();
		request.session.ip = request.ip ?? null;
		request.session.userAgent = request.get("user-agent") ?? null;
		request.session.createdAt = now;
		request.session.lastSeenAt = now;

		const csrfToken = this.csrf.generateToken(request, true);
		await this.registry.register(admin.id, request.sessionID);
		await promisify((done) => request.session.save(done));

		return csrfToken;
	}

	async beginMfaChallenge(request: Request, admin: AuthAdmin): Promise<string> {
		await promisify((done) => request.session.regenerate(done));
		request.session.pendingMfa = { adminId: admin.id, startedAt: new Date().toISOString() };

		const csrfToken = this.csrf.generateToken(request, true);
		await promisify((done) => request.session.save(done));

		return csrfToken;
	}

	pendingMfaAdminId(request: Request): string | null {
		const pending = request.session.pendingMfa;

		if (pending === undefined) {
			return null;
		}

		const age = Date.now() - Date.parse(pending.startedAt);

		return Number.isFinite(age) && age >= 0 && age <= MFA_CHALLENGE_TTL_MS ? pending.adminId : null;
	}

	async completeMfaChallenge(request: Request, admin: AuthAdmin): Promise<string> {
		delete request.session.pendingMfa;

		return this.loginAndEstablish(request, admin);
	}

	async rotate(request: Request, admin: AuthAdmin): Promise<string> {
		await this.registry.unregister(admin.id, request.sessionID);
		await promisify((done) => request.session.regenerate(done));
		return this.loginAndEstablish(request, admin);
	}

	absoluteLifetimeExceeded(request: Request): boolean {
		return absoluteSessionExpired(request.session.createdAt, this.config.env.SESSION_ABSOLUTE_TTL_HOURS * HOUR_MS);
	}

	currentToken(request: Request): string {
		return this.csrf.getTokenFromState(request) ?? this.csrf.generateToken(request);
	}

	async touch(request: Request): Promise<void> {
		request.session.lastSeenAt = new Date().toISOString();
		await promisify((done) => request.session.save(done));
	}

	async logout(request: Request, admin: AuthAdmin): Promise<void> {
		const sessionId = request.sessionID;
		await promisify((done) => request.logOut(done));
		await this.registry.unregister(admin.id, sessionId);
		await promisify((done) => request.session.destroy(done));
	}
}
