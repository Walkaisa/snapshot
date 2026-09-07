import { Injectable } from "@nestjs/common";

import { APP_NAME } from "../../common/constants.js";
import { AppConfigService } from "../../config/app-config.service.js";
import { RuntimeConfigService } from "../runtime-config/runtime-config.service.js";

export interface ShareXConfigFile {
	filename: string;
	content: string;
}

@Injectable()
export class ShareXService {
	constructor(
		private readonly runtimeConfig: RuntimeConfigService,
		private readonly config: AppConfigService,
	) {}

	async configFile(): Promise<ShareXConfigFile> {
		const runtime = await this.runtimeConfig.get();
		const authorization = `Bearer ${runtime.apiKey}`;

		const payload = {
			Version: "17.0.0",
			Name: APP_NAME,
			DestinationType: "ImageUploader, FileUploader",
			RequestMethod: "POST",
			RequestURL: `${this.config.env.BASE_URL}/api/uploads`,
			Headers: { Authorization: authorization },
			Body: "MultipartFormData",
			FileFormName: "file",
			ResponseType: "JSON",
			URL: "{json:data.url}",
			ErrorMessage: "{json:message}",
			DeletionURL: "{json:data.deleteUrl}",
			DeletionMethod: "DELETE",
			DeletionHeaders: { Authorization: authorization },
		};

		return { filename: "snapshot.sxcu", content: JSON.stringify(payload, null, 2) };
	}
}
