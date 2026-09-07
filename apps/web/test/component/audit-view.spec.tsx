import type { AuditEntry, AuditPage, AuditSummary } from "@snapshot/contracts";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuditView } from "@/components/audit/audit-view";
import en from "../../messages/en.json";
import { renderWithProviders } from "../utils";

const copy = en.audit;

const { fetchAuditPageMock, fetchAuditSummaryMock, updateConfigMock } = vi.hoisted(() => ({
	fetchAuditPageMock: vi.fn(),
	fetchAuditSummaryMock: vi.fn(),
	updateConfigMock: vi.fn(),
}));

vi.mock("@/lib/api/audit", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/api/audit")>()),
	fetchAuditPage: fetchAuditPageMock,
	fetchAuditSummary: fetchAuditSummaryMock,
}));

vi.mock("@/lib/api/config", () => ({
	updateConfig: updateConfigMock,
	revealApiKey: vi.fn(),
	rotateApiKey: vi.fn(),
	SHAREX_CONFIG_PATH: "/api/sharex",
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function entry(overrides: Partial<AuditEntry> = {}): AuditEntry {
	return {
		id: 1,
		occurredAt: "2026-09-06T10:00:00+00:00",
		action: "links.create",
		category: "links",
		severity: "info",
		outcome: "success",
		actor: "dashboard",
		targetType: "link",
		targetId: "launch",
		errorCode: null,
		requestId: "req-1",
		method: "POST",
		path: "/api/links",
		durationMs: 12,
		ipAddress: "203.0.113.42",
		userAgent: "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/141.0 Safari/537.36",
		metadata: { shortUrl: "https://img.example.com/launch", target: "https://example.com/a/very/long/destination" },
		...overrides,
	};
}

function page(items: AuditEntry[]): AuditPage {
	return { items, total: items.length, page: 1, perPage: 50 };
}

const summary: AuditSummary = {
	total: 3,
	bySeverity: { info: 1, notice: 1, warning: 1, error: 0, critical: 0 },
	oldestAt: "2026-09-01T10:00:00+00:00",
	newestAt: "2026-09-06T10:00:00+00:00",
	retentionDays: 90,
};

function renderView() {
	renderWithProviders(<AuditView initialFrom="2026-08-30T10:00:00.000Z" />);
}

describe("AuditView", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fetchAuditSummaryMock.mockResolvedValue(summary);
	});

	it("names the event, the resource it touched and the route it came in on", async () => {
		fetchAuditPageMock.mockResolvedValue(page([entry()]));
		renderView();

		expect(await screen.findByText(copy.actions.links.create)).toBeInTheDocument();
		expect(screen.getByText("/launch")).toBeInTheDocument();
		expect(screen.getByText("POST /api/links")).toBeInTheDocument();
	});

	it("keeps the outcome out of the collapsed row and states it in the detail", async () => {
		fetchAuditPageMock.mockResolvedValue(page([entry()]));
		const user = userEvent.setup();
		renderView();

		await screen.findByText(copy.actions.links.create);

		expect(screen.queryByText(copy.outcomes.success)).not.toBeInTheDocument();

		await user.click(screen.getByText(copy.actions.links.create));

		expect(await screen.findByText(copy.outcomes.success)).toBeInTheDocument();
	});

	it("states a failure in the detail too", async () => {
		fetchAuditPageMock.mockResolvedValue(page([entry({ outcome: "failure", severity: "warning", errorCode: "unauthorized" })]));
		const user = userEvent.setup();
		renderView();

		await user.click(await screen.findByText(copy.actions.links.create));

		expect(await screen.findByText(copy.outcomes.failure)).toBeInTheDocument();
		expect(screen.getByText("unauthorized")).toBeInTheDocument();
	});

	it("reveals the forensic detail only once the row is expanded", async () => {
		fetchAuditPageMock.mockResolvedValue(page([entry()]));
		const user = userEvent.setup();
		renderView();

		expect(screen.queryByText("req-1")).not.toBeInTheDocument();

		await user.click(await screen.findByText(copy.actions.links.create));

		expect(await screen.findByText("req-1")).toBeInTheDocument();
		expect(screen.getByText("12 ms")).toBeInTheDocument();
		expect(screen.getByText("203.0.113.42")).toBeInTheDocument();
		expect(screen.getByText("Chrome on Windows")).toBeInTheDocument();
		expect(screen.getByText(copy.categories.links)).toBeInTheDocument();
		expect(screen.getByText(copy.actors.dashboard)).toBeInTheDocument();
	});

	it("labels every metadata key it knows instead of dumping json", async () => {
		fetchAuditPageMock.mockResolvedValue(page([entry()]));
		const user = userEvent.setup();
		renderView();

		await user.click(await screen.findByText(copy.actions.links.create));

		expect(await screen.findByText(copy.fields.target)).toBeInTheDocument();
		expect(screen.getByText("https://example.com/a/very/long/destination")).toBeInTheDocument();
	});

	it("shows a language change with the value that was set", async () => {
		fetchAuditPageMock.mockResolvedValue(
			page([
				entry({
					action: "account.preferences_update",
					category: "account",
					targetType: "admin",
					targetId: null,
					path: "/api/account/preferences",
					method: "PATCH",
					metadata: { locale: "de" },
				}),
			]),
		);
		const user = userEvent.setup();
		renderView();

		await user.click(await screen.findByText(copy.actions.account.preferences_update));

		expect(await screen.findByText(copy.fields.locale)).toBeInTheDocument();
		expect(screen.getByText("de")).toBeInTheDocument();
	});

	it("filters by severity when a summary tile is pressed", async () => {
		fetchAuditPageMock.mockResolvedValue(page([entry()]));
		const user = userEvent.setup();
		renderView();

		await user.click(await screen.findByRole("button", { name: new RegExp(copy.severities.warning) }));

		await waitFor(() => expect(fetchAuditPageMock).toHaveBeenLastCalledWith(expect.objectContaining({ severities: ["warning"] }), 1));
	});

	it("passes the search term through to the API", async () => {
		fetchAuditPageMock.mockResolvedValue(page([entry()]));
		const user = userEvent.setup();
		renderView();

		await user.type(await screen.findByLabelText(copy.search), "launch");

		await waitFor(() => expect(fetchAuditPageMock).toHaveBeenLastCalledWith(expect.objectContaining({ search: "launch" }), 1));
	});

	it("widens the window to everything when the range is cleared", async () => {
		fetchAuditPageMock.mockResolvedValue(page([entry()]));
		const user = userEvent.setup();
		renderView();

		await user.click(await screen.findByRole("radio", { name: copy.range.options["0"] }));

		await waitFor(() => expect(fetchAuditPageMock).toHaveBeenLastCalledWith(expect.objectContaining({ from: null }), 1));
	});

	it("starts from the window the server rendered", async () => {
		fetchAuditPageMock.mockResolvedValue(page([entry()]));
		renderView();

		await waitFor(() =>
			expect(fetchAuditPageMock).toHaveBeenCalledWith(expect.objectContaining({ from: "2026-08-30T10:00:00.000Z" }), 1),
		);
	});

	it("refetches the list and the counters on demand", async () => {
		fetchAuditPageMock.mockResolvedValue(page([entry()]));
		const user = userEvent.setup();
		renderView();

		await screen.findByText(copy.actions.links.create);
		fetchAuditPageMock.mockClear();
		fetchAuditSummaryMock.mockClear();

		await user.click(screen.getByRole("button", { name: copy.refresh }));

		await waitFor(() => {
			expect(fetchAuditPageMock).toHaveBeenCalled();
			expect(fetchAuditSummaryMock).toHaveBeenCalled();
		});
	});

	it("shows the empty state when nothing matches", async () => {
		fetchAuditPageMock.mockResolvedValue(page([]));
		renderView();

		expect(await screen.findByText(copy.empty.none.title)).toBeInTheDocument();
	});

	it("changes the retention through the config endpoint", async () => {
		fetchAuditPageMock.mockResolvedValue(page([entry()]));
		updateConfigMock.mockResolvedValue({});
		const user = userEvent.setup();
		renderView();

		await user.click(await screen.findByRole("button", { name: /90/ }));
		await user.click(await screen.findByRole("menuitem", { name: "30 days" }));

		await waitFor(() => expect(updateConfigMock).toHaveBeenCalledWith({ auditRetentionDays: 30 }, expect.anything()));
	});
});
