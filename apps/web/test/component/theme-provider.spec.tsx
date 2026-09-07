import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "@/components/theme-provider";

describe("ThemeProvider", () => {
	it("does not render an inline script on the client", () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

		try {
			const { container } = render(
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
					<span>content</span>
				</ThemeProvider>,
			);

			expect(screen.getByText("content")).toBeInTheDocument();
			expect(container.querySelector("script")).not.toBeInTheDocument();
			expect(consoleError.mock.calls.flat().join(" ")).not.toContain("Encountered a script tag while rendering React component");
		} finally {
			consoleError.mockRestore();
		}
	});
});
