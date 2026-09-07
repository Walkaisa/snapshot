import { HttpStatus, Injectable } from "@nestjs/common";
import type { AccountView, PreferencesUpdate } from "@snapshot/contracts";

import { AppException } from "../../common/exceptions/app.exception.js";
import { type AdminRecord, AdminRepository } from "../../db/repositories/admin.repository.js";
import { PasswordHasher } from "../auth/password-hasher.service.js";

function toAccountView(record: AdminRecord): AccountView {
	return { username: record.username, theme: record.theme, locale: record.locale };
}

@Injectable()
export class AccountService {
	constructor(
		private readonly admins: AdminRepository,
		private readonly hasher: PasswordHasher,
	) {}

	async changeUsername(id: string, currentPassword: string, username: string): Promise<AccountView> {
		const record = await this.admins.findById(id);

		if (record === null || !(await this.hasher.verify(record.passwordHash, currentPassword))) {
			throw new AppException(HttpStatus.UNAUTHORIZED, "Current password is incorrect", "unauthorized");
		}

		await this.admins.updateUsername(id, username);

		return toAccountView({ ...record, username });
	}

	async updatePreferences(id: string, preferences: PreferencesUpdate): Promise<AccountView> {
		const record = await this.admins.findById(id);

		if (record === null) {
			throw new AppException(HttpStatus.UNAUTHORIZED, "Not authenticated", "unauthorized");
		}

		await this.admins.updatePreferences(id, preferences);

		return toAccountView({ ...record, ...preferences });
	}
}
