import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import {
	type MfaStatus,
	type RecoveryCodes,
	TOTP_CODE_PATTERN,
	TOTP_DIGITS,
	TOTP_PERIOD_SECONDS,
	type TotpEnrollment,
} from "@snapshot/contracts";
import { Redis } from "ioredis";

import { APP_NAME } from "../../common/constants.js";
import { AppException } from "../../common/exceptions/app.exception.js";
import { AppConfigService } from "../../config/app-config.service.js";
import { type AdminRecord, AdminRepository } from "../../db/repositories/admin.repository.js";
import { RecoveryCodeRepository } from "../../db/repositories/recovery-code.repository.js";
import { REDIS, redisKeys } from "../../redis/redis.constants.js";
import { PasswordHasher } from "./password-hasher.service.js";
import { generateRecoveryCodes, hashRecoveryCode, recoveryCodeMatches } from "./recovery-codes.js";
import { decryptSecret, deriveSecretKey, encryptSecret } from "./secret-cipher.js";
import { generateTotpSecret, matchTotp, TOTP_REPLAY_TTL_SECONDS, totpUri } from "./totp.js";

@Injectable()
export class MfaService {
	private readonly key: Buffer;

	constructor(
		private readonly admins: AdminRepository,
		private readonly recoveryCodes: RecoveryCodeRepository,
		private readonly hasher: PasswordHasher,
		config: AppConfigService,
		@Inject(REDIS) private readonly redis: Redis,
	) {
		this.key = deriveSecretKey(config.env.MFA_ENCRYPTION_KEY);
	}

	async status(adminId: string): Promise<MfaStatus> {
		const admin = await this.requireAdmin(adminId);

		return {
			enabled: this.isEnabled(admin),
			pendingEnrollment: admin.totpSecret !== null && admin.totpConfirmedAt === null,
			label: this.isEnabled(admin) ? admin.totpLabel : null,
			enabledAt: admin.totpConfirmedAt?.toISOString() ?? null,
			recoveryCodesRemaining: await this.recoveryCodes.countUnused(adminId),
		};
	}

	async isEnabledFor(adminId: string): Promise<boolean> {
		const admin = await this.admins.findById(adminId);

		return admin !== null && this.isEnabled(admin);
	}

	async beginEnrollment(adminId: string, currentPassword: string): Promise<TotpEnrollment> {
		const admin = await this.verifyPassword(adminId, currentPassword);

		if (this.isEnabled(admin)) {
			throw new AppException(HttpStatus.CONFLICT, "Two-factor authentication is already enabled", "conflict");
		}

		const secret = generateTotpSecret();
		await this.admins.updateTotp(adminId, { secret: encryptSecret(secret, this.key), label: null, confirmedAt: null });

		return {
			secret,
			otpauthUri: totpUri(secret, APP_NAME, admin.username),
			issuer: APP_NAME,
			account: admin.username,
			digits: TOTP_DIGITS,
			period: TOTP_PERIOD_SECONDS,
		};
	}

	async enable(adminId: string, code: string, label: string): Promise<RecoveryCodes> {
		const admin = await this.requireAdmin(adminId);

		if (this.isEnabled(admin)) {
			throw new AppException(HttpStatus.CONFLICT, "Two-factor authentication is already enabled", "conflict");
		}

		const secret = this.readSecret(admin);

		if (secret === null) {
			throw new AppException(HttpStatus.CONFLICT, "Start the setup before confirming a code", "conflict");
		}

		if (!(await this.consumeTotp(adminId, secret, code))) {
			throw new AppException(HttpStatus.UNAUTHORIZED, "That code is not valid", "unauthorized");
		}

		await this.admins.updateTotp(adminId, { secret: admin.totpSecret, label, confirmedAt: new Date() });

		return this.issueRecoveryCodes(adminId);
	}

	async disable(adminId: string, currentPassword: string, code: string): Promise<void> {
		const admin = await this.verifyPassword(adminId, currentPassword);

		if (!this.isEnabled(admin)) {
			return;
		}

		if (!(await this.verifyCode(admin, code))) {
			throw new AppException(HttpStatus.UNAUTHORIZED, "That code is not valid", "unauthorized");
		}

		await this.admins.updateTotp(adminId, { secret: null, label: null, confirmedAt: null });
		await this.recoveryCodes.deleteAll(adminId);
	}

	async cancelEnrollment(adminId: string): Promise<void> {
		const admin = await this.requireAdmin(adminId);

		if (this.isEnabled(admin) || admin.totpSecret === null) {
			return;
		}

		await this.admins.updateTotp(adminId, { secret: null, label: null, confirmedAt: null });
	}

	async regenerateRecoveryCodes(adminId: string, currentPassword: string, code: string): Promise<RecoveryCodes> {
		const admin = await this.verifyPassword(adminId, currentPassword);

		if (!this.isEnabled(admin)) {
			throw new AppException(HttpStatus.CONFLICT, "Two-factor authentication is not enabled", "conflict");
		}

		if (!(await this.verifyCode(admin, code))) {
			throw new AppException(HttpStatus.UNAUTHORIZED, "That code is not valid", "unauthorized");
		}

		return this.issueRecoveryCodes(adminId);
	}

	async verifyChallenge(adminId: string, code: string): Promise<boolean> {
		const admin = await this.admins.findById(adminId);

		if (admin === null || !this.isEnabled(admin)) {
			return false;
		}

		return this.verifyCode(admin, code);
	}

	private async verifyCode(admin: AdminRecord, code: string): Promise<boolean> {
		if (TOTP_CODE_PATTERN.test(code)) {
			const secret = this.readSecret(admin);

			return secret !== null && (await this.consumeTotp(admin.id, secret, code));
		}

		return this.consumeRecoveryCode(admin.id, code);
	}

	private async consumeTotp(adminId: string, secret: string, code: string): Promise<boolean> {
		const match = matchTotp(secret, code);

		if (match === null) {
			return false;
		}

		const claimed = await this.redis.set(redisKeys.totpReplay(adminId, match.counter), "1", "EX", TOTP_REPLAY_TTL_SECONDS, "NX");

		return claimed === "OK";
	}

	private async consumeRecoveryCode(adminId: string, code: string): Promise<boolean> {
		const candidate = hashRecoveryCode(code);
		const stored = await this.recoveryCodes.listUnused(adminId);
		const hit = stored.find((entry) => recoveryCodeMatches(candidate, entry.codeHash));

		return hit === undefined ? false : this.recoveryCodes.consume(hit.id);
	}

	private async issueRecoveryCodes(adminId: string): Promise<RecoveryCodes> {
		const codes = generateRecoveryCodes();
		await this.recoveryCodes.replaceAll(adminId, codes.map(hashRecoveryCode));

		return { codes };
	}

	private isEnabled(admin: AdminRecord): boolean {
		return admin.totpSecret !== null && admin.totpConfirmedAt !== null;
	}

	private readSecret(admin: AdminRecord): string | null {
		return admin.totpSecret === null ? null : decryptSecret(admin.totpSecret, this.key);
	}

	private async requireAdmin(adminId: string): Promise<AdminRecord> {
		const admin = await this.admins.findById(adminId);

		if (admin === null) {
			throw new AppException(HttpStatus.UNAUTHORIZED, "Not authenticated", "unauthorized");
		}

		return admin;
	}

	private async verifyPassword(adminId: string, currentPassword: string): Promise<AdminRecord> {
		const admin = await this.requireAdmin(adminId);

		if (!(await this.hasher.verify(admin.passwordHash, currentPassword))) {
			throw new AppException(HttpStatus.UNAUTHORIZED, "Current password is incorrect", "unauthorized");
		}

		return admin;
	}
}
