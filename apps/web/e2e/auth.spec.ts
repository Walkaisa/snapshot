import { expect, test } from "@playwright/test";

import { ADMIN, ensureAdmin } from "./fixtures";

test.beforeAll(async ({ baseURL }) => {
	await ensureAdmin(baseURL as string);
});

test.describe("auth gate", () => {
	test("bounces an anonymous visitor off the dashboard", async ({ page }) => {
		await page.goto("/overview");

		await expect(page).toHaveURL(/\/sign-in$/);
		await expect(page.getByText("Enter your credentials to access the dashboard.")).toBeVisible();
	});

	test("sends the root at the sign-in page while signed out", async ({ page }) => {
		await page.goto("/");

		await expect(page).toHaveURL(/\/sign-in$/);
	});
});

test.describe("sign in", () => {
	test("rejects a wrong password without leaking which field was wrong", async ({ page }) => {
		await page.goto("/sign-in");
		await page.getByLabel("Username").fill(ADMIN.username);
		await page.getByLabel("Password").fill("definitely-not-the-password");
		await page.getByRole("button", { name: "Sign in" }).click();

		await expect(page.getByText("Invalid username or password")).toBeVisible();
		await expect(page).toHaveURL(/\/sign-in$/);
	});

	test("signs in, lands on the overview and signs back out", async ({ page }) => {
		await page.goto("/sign-in");
		await page.getByLabel("Username").fill(ADMIN.username);
		await page.getByLabel("Password").fill(ADMIN.password);
		await page.getByRole("button", { name: "Sign in" }).click();

		await expect(page).toHaveURL(/\/overview$/);
		await expect(page.getByText("Active sessions")).toBeVisible();
		await expect(page.getByText("Storage used")).toBeVisible();

		await page.getByRole("button", { name: /sign out/i }).click();
		await expect(page).toHaveURL(/\/sign-in$/);

		await page.goto("/overview");
		await expect(page).toHaveURL(/\/sign-in$/);
	});
});
