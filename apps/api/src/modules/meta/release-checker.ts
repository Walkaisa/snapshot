export interface ReleaseChecker {
	latestVersion(): Promise<string | null>;
}

export const RELEASE_CHECKER = Symbol("RELEASE_CHECKER");
