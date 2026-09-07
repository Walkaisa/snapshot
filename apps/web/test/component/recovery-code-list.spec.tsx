import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RecoveryCodeList } from "@/components/settings/recovery-code-list";
import { renderWithProviders } from "../utils";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const CODES = [
	"UD6C4-7RDAJ",
	"LYBDY-ZSSF6",
	"YUEND-JSX3K",
	"XCKPA-GUX43",
	"FEDG3-RCVMQ",
	"QS5HH-996X7",
	"F7KUW-YZLPL",
	"N2DKJ-RH9A5",
	"45ZJN-ZPJJT",
	"2XJAL-ETYHA",
];

let blobs: Blob[] = [];
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;
const originalClick = HTMLAnchorElement.prototype.click;

beforeEach(() => {
	blobs = [];
	URL.createObjectURL = (blob: Blob | MediaSource) => {
		blobs.push(blob as Blob);
		return "blob:stub";
	};
	URL.revokeObjectURL = () => {};
	HTMLAnchorElement.prototype.click = () => {};
});

afterEach(() => {
	URL.createObjectURL = originalCreate;
	URL.revokeObjectURL = originalRevoke;
	HTMLAnchorElement.prototype.click = originalClick;
});

async function downloadedFile(): Promise<string> {
	const user = userEvent.setup();
	renderWithProviders(<RecoveryCodeList codes={CODES} account="Walkaisa" />);

	await user.click(screen.getByRole("button", { name: "Download" }));

	return (blobs[0] as Blob).text();
}

describe("RecoveryCodeList", () => {
	it("numbers every code on screen so a dash cannot read as a separator", () => {
		renderWithProviders(<RecoveryCodeList codes={CODES} account="Walkaisa" />);

		const items = screen.getAllByRole("listitem");

		expect(items).toHaveLength(CODES.length);
		expect(items[0]).toHaveTextContent("1UD6C4-7RDAJ");
		expect(items[9]).toHaveTextContent("102XJAL-ETYHA");
	});

	it("writes one numbered code per line into the file", async () => {
		const text = await downloadedFile();

		expect(text).toContain(" 1.  UD6C4-7RDAJ");
		expect(text).toContain("10.  2XJAL-ETYHA");
		expect(text).toContain("10 recovery codes, one per line, each usable once");
	});

	it("right-aligns the numbers so the codes line up in a monospace viewer", async () => {
		const text = await downloadedFile();
		const lines = text.split("\n").filter((line) => /^\s*\d+\.\s/.test(line));

		expect(lines).toHaveLength(CODES.length);
		expect(new Set(lines.map((line) => line.indexOf(line.trim().split(".  ")[1] as string))).size).toBe(1);
	});

	it("records which account and instance the codes belong to", async () => {
		const text = await downloadedFile();

		expect(text).toContain("Account:");
		expect(text).toContain("Walkaisa");
		expect(text).toContain("Instance:");
		expect(text).toContain("Generated:");
	});

	it("copies the same numbered list to the clipboard", async () => {
		const user = userEvent.setup();
		const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
		renderWithProviders(<RecoveryCodeList codes={CODES} account="Walkaisa" />);

		await user.click(screen.getByRole("button", { name: "Copy" }));

		expect(writeText).toHaveBeenCalledTimes(1);
		expect(writeText.mock.calls[0]?.[0]).toContain(" 1. UD6C4-7RDAJ");
		writeText.mockRestore();
	});
});
