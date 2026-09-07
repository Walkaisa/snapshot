import { Agent, type Server } from "node:http";
import type { Test } from "supertest";
import supertest from "supertest";

const keepAlive = new Agent({ keepAlive: true });

function useKeepAlive(request: Test): void {
	request.agent(keepAlive);
}

export type ApiAgent = ReturnType<typeof supertest.agent>;
export type ApiRequest = Test;
export type ApiClient = Pick<ApiAgent, "get" | "post" | "patch" | "delete">;

export function apiAgent(server: Server): ApiAgent {
	return supertest.agent(server).use(useKeepAlive);
}

export function api(server: Server): ApiClient {
	const client = supertest(server);

	return {
		get: (url) => client.get(url).use(useKeepAlive),
		post: (url) => client.post(url).use(useKeepAlive),
		patch: (url) => client.patch(url).use(useKeepAlive),
		delete: (url) => client.delete(url).use(useKeepAlive),
	};
}
