import type { Redis } from "ioredis";
import { Secret, TOTP } from "otpauth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppConfigService } from "../../../src/config/app-config.service.js";
import type { AdminRecord, AdminRepository } from "../../../src/db/repositories/admin.repository.js";
import type { RecoveryCodeRepository } from "../../../src/db/repositories/recovery-code.repository.js";
import { MfaService } from "../../../src/modules/auth/mfa.service.js";
import type { PasswordHasher } from "../../../src/modules/auth/password-hasher.service.js";
import { hashRecoveryCode } from "../../../src/modules/auth/recovery-codes.js";
import { deriveSecretKey, encryptSecret } from "../../../src/modules/auth/secret-cipher.js";

const SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
const KEY = "test-mfa-encryption-key";
const RECOVERY_CODE = "ABCDE-FG234";
const findById = vi.fn();
const updateTotp = vi.fn();
const verify = vi.fn();
const listUnused = vi.fn();
const consume = vi.fn();
const deleteAll = vi.fn();
const set = vi.fn();

function service(): MfaService {
	return new MfaService(
		{ findById, updateTotp } as unknown as AdminRepository,
		{ listUnused, consume, deleteAll } as unknown as RecoveryCodeRepository,
		{ verify } as unknown as PasswordHasher,
		{ env: { MFA_ENCRYPTION_KEY: KEY } } as AppConfigService,
		{ set } as unknown as Redis,
	);
}

function currentCode(): string {
	return new TOTP({ secret: Secret.fromBase32(SECRET) }).generate();
}

beforeEach(() => {
	vi.resetAllMocks();
	const now = new Date();
	const admin: AdminRecord = {
		id: "admin-id",
		username: "admin",
		passwordHash: "password-hash",
		passwordChangedAt: now,
		totpSecret: encryptSecret(SECRET, deriveSecretKey(KEY)),
		totpLabel: "Authenticator",
		totpConfirmedAt: now,
		theme: "system",
		locale: "system",
		createdAt: now,
		updatedAt: now,
	};
	findById.mockResolvedValue(admin);
	verify.mockResolvedValue(true);
	listUnused.mockResolvedValue([{ id: "recovery-id", codeHash: hashRecoveryCode(RECOVERY_CODE) }]);
	consume.mockResolvedValue(true);
	set.mockResolvedValue("OK");
});

describe("MfaService.disable", () => {
	it("requires the password before consuming a code", async () => {
		verify.mockResolvedValue(false);
		await expect(service().disable("admin-id", "wrong", RECOVERY_CODE)).rejects.toMatchObject({ status: 401 });
		expect(consume).not.toHaveBeenCalled();
		expect(set).not.toHaveBeenCalled();
		expect(updateTotp).not.toHaveBeenCalled();
	});

	it("accepts a fresh TOTP and removes the factor and recovery codes", async () => {
		await service().disable("admin-id", "password", currentCode());
		expect(set).toHaveBeenCalledWith(expect.any(String), "1", "EX", expect.any(Number), "NX");
		expect(updateTotp).toHaveBeenCalledWith("admin-id", { secret: null, label: null, confirmedAt: null });
		expect(deleteAll).toHaveBeenCalledWith("admin-id");
	});

	it("rejects a TOTP already claimed by another request", async () => {
		set.mockResolvedValue(null);
		await expect(service().disable("admin-id", "password", currentCode())).rejects.toMatchObject({ status: 401 });
		expect(updateTotp).not.toHaveBeenCalled();
		expect(deleteAll).not.toHaveBeenCalled();
	});

	it("rejects an invalid code without changing the factor", async () => {
		await expect(service().disable("admin-id", "password", "invalid-code")).rejects.toMatchObject({ status: 401 });
		expect(updateTotp).not.toHaveBeenCalled();
		expect(deleteAll).not.toHaveBeenCalled();
	});

	it("accepts an unused recovery code even when the TOTP secret cannot be decrypted", async () => {
		const admin: AdminRecord = await findById();
		findById.mockResolvedValue({ ...admin, totpSecret: "unreadable" });
		await service().disable("admin-id", "password", RECOVERY_CODE);
		expect(consume).toHaveBeenCalledWith("recovery-id");
		expect(updateTotp).toHaveBeenCalledWith("admin-id", { secret: null, label: null, confirmedAt: null });
	});

	it("rejects a recovery code consumed by a concurrent request", async () => {
		consume.mockResolvedValue(false);
		await expect(service().disable("admin-id", "password", RECOVERY_CODE)).rejects.toMatchObject({ status: 401 });
		expect(updateTotp).not.toHaveBeenCalled();
		expect(deleteAll).not.toHaveBeenCalled();
	});
});
