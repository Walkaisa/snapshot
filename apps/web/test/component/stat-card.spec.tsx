import { render, screen } from "@testing-library/react";
import { Package } from "lucide-react";
import { describe, expect, it } from "vitest";

import { StatCard } from "@/components/dashboard/stat-card";

describe("StatCard", () => {
	it("renders the label, value and hint", () => {
		render(<StatCard icon={Package} label="Uploads" value={42} hint="all time" />);

		expect(screen.getByText("Uploads")).toBeInTheDocument();
		expect(screen.getByText("42")).toBeInTheDocument();
		expect(screen.getByText("all time")).toBeInTheDocument();
	});

	it("omits the hint when not provided", () => {
		render(<StatCard icon={Package} label="Views" value={0} />);

		expect(screen.getByText("Views")).toBeInTheDocument();
		expect(screen.getByText("0")).toBeInTheDocument();
	});
});
