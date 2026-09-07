import type { LinkList } from "@snapshot/contracts";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LinksView } from "@/components/links/links-view";
import en from "../../messages/en.json";
import { renderWithProviders } from "../utils";

const copy = en.links;

const { createLinkMock, deleteLinkMock, fetchLinksPageMock, updateLinkMock } = vi.hoisted(() => ({
	createLinkMock: vi.fn(),
	deleteLinkMock: vi.fn(),
	fetchLinksPageMock: vi.fn(),
	updateLinkMock: vi.fn(),
}));

vi.mock("@/lib/api/links", () => ({
	LINKS_PAGE_SIZE: 25,
	createLink: createLinkMock,
	deleteLink: deleteLinkMock,
	fetchLinksPage: fetchLinksPageMock,
	updateLink: updateLinkMock,
	linkListPath: (page: number) => `/api/links?page=${page}`,
}));

vi.mock("@/lib/api/ids", () => ({ fetchIdAvailability: vi.fn().mockResolvedValue({ id: "x", available: true, occupiedBy: null }) }));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const link = {
	slug: "launch",
	targetUrl: "https://example.com/a/very/long/link",
	visits: 12,
	createdAt: "2026-09-01T10:00:00+00:00",
	shortUrl: "https://img.example.com/launch",
	deleteUrl: "https://img.example.com/api/links/launch",
};

function page(items: (typeof link)[]): LinkList {
	return { items, total: items.length, page: 1, perPage: 25 };
}

async function openCreateDialog(user: ReturnType<typeof userEvent.setup>): Promise<void> {
	await user.click(await screen.findByRole("button", { name: copy.create.action }));
}

describe("LinksView", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("lists the short links it loaded", async () => {
		fetchLinksPageMock.mockResolvedValue(page([link]));
		renderWithProviders(<LinksView baseUrl="https://img.example.com" />);

		expect(await screen.findByRole("link", { name: "/launch" })).toHaveAttribute("href", link.shortUrl);
		expect(screen.getByRole("link", { name: "example.com/a/very/long/link" })).toHaveAttribute("href", link.targetUrl);
		expect(screen.getAllByText("12").length).toBeGreaterThan(0);
	});

	it("shows the empty state when there is nothing yet", async () => {
		fetchLinksPageMock.mockResolvedValue(page([]));
		renderWithProviders(<LinksView baseUrl="https://img.example.com" />);

		expect(await screen.findByText(copy.empty.none.title)).toBeInTheDocument();
	});

	it("sends the destination without a slug when none was typed", async () => {
		fetchLinksPageMock.mockResolvedValue(page([]));
		createLinkMock.mockResolvedValue(link);
		const user = userEvent.setup();
		renderWithProviders(<LinksView baseUrl="https://img.example.com" />);

		await openCreateDialog(user);
		await user.type(await screen.findByLabelText(copy.create.fields.url), "https://example.com/long");
		await user.click(screen.getByRole("button", { name: copy.create.submit }));

		await waitFor(() => expect(createLinkMock).toHaveBeenCalledWith({ url: "https://example.com/long" }));
	});

	it("sends a custom slug when one was typed", async () => {
		fetchLinksPageMock.mockResolvedValue(page([]));
		createLinkMock.mockResolvedValue(link);
		const user = userEvent.setup();
		renderWithProviders(<LinksView baseUrl="https://img.example.com" />);

		await openCreateDialog(user);
		await user.type(await screen.findByLabelText(copy.create.fields.url), "https://example.com/long");
		await user.type(screen.getByLabelText(copy.create.fields.slug), "launch");
		await user.click(screen.getByRole("button", { name: copy.create.submit }));

		await waitFor(() => expect(createLinkMock).toHaveBeenCalledWith({ url: "https://example.com/long", slug: "launch" }));
	});

	it("refuses a destination that is not an http url", async () => {
		fetchLinksPageMock.mockResolvedValue(page([]));
		const user = userEvent.setup();
		renderWithProviders(<LinksView baseUrl="https://img.example.com" />);

		await openCreateDialog(user);
		await user.type(await screen.findByLabelText(copy.create.fields.url), "javascript:alert(1)");
		await user.click(screen.getByRole("button", { name: copy.create.submit }));

		expect(await screen.findByText(copy.create.errors.url)).toBeInTheDocument();
		expect(createLinkMock).not.toHaveBeenCalled();
	});

	it("refuses a slug the namespace cannot issue", async () => {
		fetchLinksPageMock.mockResolvedValue(page([]));
		const user = userEvent.setup();
		renderWithProviders(<LinksView baseUrl="https://img.example.com" />);

		await openCreateDialog(user);
		await user.type(await screen.findByLabelText(copy.create.fields.url), "https://example.com/long");
		await user.type(screen.getByLabelText(copy.create.fields.slug), "-nope");
		await user.click(screen.getByRole("button", { name: copy.create.submit }));

		await waitFor(() => expect(createLinkMock).not.toHaveBeenCalled());
	});

	it("deletes a link once the confirmation is accepted", async () => {
		fetchLinksPageMock.mockResolvedValue(page([link]));
		deleteLinkMock.mockResolvedValue({ slug: "launch" });
		const user = userEvent.setup();
		renderWithProviders(<LinksView baseUrl="https://img.example.com" />);

		await user.click(await screen.findByRole("button", { name: copy.actions.more }));
		await user.click(await screen.findByRole("menuitem", { name: copy.actions.delete }));
		await user.click(await screen.findByRole("button", { name: copy.actions.delete }));

		await waitFor(() => expect(deleteLinkMock).toHaveBeenCalledWith("launch"));
	});

	it("reorders the list when another sort preset is picked", async () => {
		fetchLinksPageMock.mockResolvedValue(page([link]));
		const user = userEvent.setup();
		renderWithProviders(<LinksView baseUrl="https://img.example.com" />);

		await user.click(await screen.findByRole("button", { name: copy.list.sort.options.newest }));
		await user.click(await screen.findByRole("menuitem", { name: copy.list.sort.options.visits }));

		await waitFor(() => expect(fetchLinksPageMock).toHaveBeenLastCalledWith(1, 25, { sort: "visits", order: "desc", search: "" }));
	});
});
