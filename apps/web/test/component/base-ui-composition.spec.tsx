import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConfirmDialog } from "@/components/settings/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbLink } from "@/components/ui/breadcrumb";
import { buttonVariants } from "@/components/ui/button";
import { renderWithProviders } from "../utils";

vi.mock("next/link", () => ({
	default: ({ href, children, ...props }: { href: string; children?: React.ReactNode }) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

describe("Base UI composition (render replaces asChild)", () => {
	it("keeps link semantics for a navigation styled as a button", () => {
		renderWithProviders(
			<a href="/overview" className={buttonVariants()}>
				Back
			</a>,
		);

		const link = screen.getByRole("link", { name: "Back" });
		expect(link.tagName).toBe("A");
		expect(link).not.toHaveAttribute("role", "button");
		expect(link.querySelector("button")).toBeNull();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("renders a BreadcrumbLink as one anchor with no nested link", () => {
		renderWithProviders(<BreadcrumbLink render={<a href="/overview" />}>Dashboard</BreadcrumbLink>);

		const link = screen.getByRole("link", { name: "Dashboard" });
		expect(link.tagName).toBe("A");
		expect(within(link).queryByRole("link")).toBeNull();
	});

	it("renders a Badge as a real button when composed with render", async () => {
		const onClick = vi.fn();
		const user = userEvent.setup();
		renderWithProviders(
			<Badge variant="secondary" render={<button type="button" onClick={onClick} />}>
				{"{filename}"}
			</Badge>,
		);

		const badge = screen.getByRole("button", { name: "{filename}" });
		expect(badge.querySelector("button")).toBeNull();

		await user.click(badge);
		expect(onClick).toHaveBeenCalledTimes(1);
	});
});

describe("ConfirmDialog focus management", () => {
	function setup(onOpenChange = vi.fn(), onConfirm = vi.fn()) {
		return {
			onOpenChange,
			onConfirm,
			...renderWithProviders(
				<>
					<button type="button">outside trigger</button>
					<ConfirmDialog
						open
						onOpenChange={onOpenChange}
						title="Revoke sessions"
						description="This signs out every other session."
						confirmLabel="Revoke"
						onConfirm={onConfirm}
						destructive
					/>
				</>,
			),
		};
	}

	it("exposes the title and description to assistive tech and moves focus into the dialog", async () => {
		setup();

		const dialog = await screen.findByRole("dialog");
		expect(within(dialog).getByText("Revoke sessions")).toBeInTheDocument();
		expect(within(dialog).getByText("This signs out every other session.")).toBeInTheDocument();

		await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
	});

	it("closes on Escape", async () => {
		const onOpenChange = vi.fn();
		const user = userEvent.setup();
		setup(onOpenChange);

		await screen.findByRole("dialog");
		await user.keyboard("{Escape}");

		await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything()));
	});

	it("confirms via the destructive action", async () => {
		const onConfirm = vi.fn();
		const user = userEvent.setup();
		setup(vi.fn(), onConfirm);

		const dialog = await screen.findByRole("dialog");
		await user.click(within(dialog).getByRole("button", { name: "Revoke" }));

		expect(onConfirm).toHaveBeenCalledTimes(1);
	});
});
