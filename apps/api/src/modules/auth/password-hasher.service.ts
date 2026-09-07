import { Injectable } from "@nestjs/common";
import { hash, verify } from "@node-rs/argon2";

import { AppConfigService } from "../../config/app-config.service.js";

const ENCODED_PARAMS = /\$argon2id\$v=\d+\$m=(\d+),t=(\d+),p=(\d+)\$/;

@Injectable()
export class PasswordHasher {
	private readonly options: {
		timeCost: number;
		memoryCost: number;
		parallelism: number;
	};

	constructor(config: AppConfigService) {
		this.options = {
			timeCost: config.env.ARGON2_TIME_COST,
			memoryCost: config.env.ARGON2_MEMORY_COST,
			parallelism: config.env.ARGON2_PARALLELISM,
		};
	}

	hash(password: string): Promise<string> {
		return hash(password, this.options);
	}

	async verify(encoded: string, password: string): Promise<boolean> {
		try {
			return await verify(encoded, password, this.options);
		} catch {
			return false;
		}
	}

	needsRehash(encoded: string): boolean {
		const match = ENCODED_PARAMS.exec(encoded);

		if (match === null) {
			return true;
		}

		const [, memory, time, parallelism] = match;

		return (
			Number(memory) !== this.options.memoryCost ||
			Number(time) !== this.options.timeCost ||
			Number(parallelism) !== this.options.parallelism
		);
	}
}
