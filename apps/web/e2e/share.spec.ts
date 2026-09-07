import { expect, test } from "@playwright/test";

import { apiContext, ensureAdmin, fetchApiKey, PNG_4X2, PNG_HEIGHT, PNG_WIDTH } from "./fixtures";

let uploadId = "";

test.beforeAll(async ({ baseURL }) => {
	const origin = baseURL as string;
	await ensureAdmin(origin);

	const apiKey = await fetchApiKey(origin);
	const api = await apiContext(origin);

	try {
		const response = await api.post("/api/uploads", {
			headers: { Authorization: `Bearer ${apiKey}` },
			multipart: { file: { name: "pixel.png", mimeType: "image/png", buffer: PNG_4X2 } },
		});

		expect(response.status(), "upload should succeed with an api key").toBe(201);
		uploadId = (await response.json()).data.id;
	} finally {
		await api.dispose();
	}
});

test.describe("share page", () => {
	test("renders the upload for an anonymous visitor", async ({ page }) => {
		await page.goto(`/${uploadId}`);

		await expect(page.getByRole("img", { name: `${uploadId}.png` })).toBeVisible();
		await expect(page.getByText("image/png")).toBeVisible();
		await expect(page.getByText(`${PNG_WIDTH} × ${PNG_HEIGHT}`)).toBeVisible();
		await expect(page.getByRole("link", { name: "Download" })).toHaveAttribute("href", /download=1$/);
		await expect(page.getByRole("link", { name: "Get Snapshot." })).toBeVisible();
	});

	test("serves the full Open Graph set", async ({ page }) => {
		await page.goto(`/${uploadId}`);

		const meta = (property: string) => page.locator(`meta[property="${property}"]`).getAttribute("content");

		expect(await meta("og:type")).toBe("website");
		expect(await meta("og:image")).toMatch(new RegExp(`/raw/${uploadId}\\.png$`));
		expect(await meta("og:image:width")).toBe(String(PNG_WIDTH));
		expect(await meta("og:image:height")).toBe(String(PNG_HEIGHT));
		expect(await page.locator('meta[name="twitter:card"]').getAttribute("content")).toBe("summary_large_image");
		expect(await page.locator('meta[name="og:theme-color"]').getAttribute("content")).toMatch(/^#[0-9A-Fa-f]{6}$/);
	});

	test("404s an unknown id", async ({ page }) => {
		const response = await page.goto("/ZZdoesNotExist");

		expect(response?.status()).toBe(404);
		await expect(page.getByText("File not found")).toBeVisible();
	});

	test("serves the raw file with range support", async ({ baseURL }) => {
		const api = await apiContext(baseURL as string);

		try {
			const full = await api.get(`/raw/${uploadId}.png`);
			expect(full.status()).toBe(200);
			expect(full.headers()["accept-ranges"]).toBe("bytes");
			expect(Buffer.from(await full.body()).equals(PNG_4X2)).toBe(true);

			const partial = await api.get(`/raw/${uploadId}.png`, { headers: { Range: "bytes=0-9" } });
			expect(partial.status()).toBe(206);
			expect(partial.headers()["content-range"]).toBe(`bytes 0-9/${PNG_4X2.length}`);
		} finally {
			await api.dispose();
		}
	});
});
