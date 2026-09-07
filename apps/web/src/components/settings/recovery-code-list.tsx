"use client";

import { Check, Copy, Download, TriangleAlert } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const FILENAME = "snapshot-recovery-codes.txt";

export function RecoveryCodeList({ codes, account }: { codes: string[]; account: string }) {
	const t = useTranslations("settings.mfa.recovery");
	const format = useFormatter();
	const [copied, setCopied] = useState(false);

	const numberWidth = String(codes.length).length;

	function numbered(separator: string): string[] {
		return codes.map((code, index) => `${String(index + 1).padStart(numberWidth, " ")}${separator}${code}`);
	}

	async function copy(): Promise<void> {
		try {
			await navigator.clipboard.writeText(numbered(". ").join("\n"));
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			toast.error(t("copyError"));
		}
	}

	function fileContents(): string {
		const heading = t("file.heading");
		const labels = [t("file.account"), t("file.instance"), t("file.generated")];
		const labelWidth = Math.max(...labels.map((label) => label.length)) + 1;
		const values = [account, typeof window === "undefined" ? "" : window.location.origin, format.dateTime(new Date(), "dateTime")];
		const listHeading = t("file.listHeading", { count: codes.length });
		const rule = "-".repeat(Math.max(listHeading.length, heading.length));

		return [
			heading,
			"=".repeat(heading.length),
			"",
			...labels.map((label, index) => `${`${label}:`.padEnd(labelWidth + 1)}${values[index]}`),
			"",
			t("file.usage"),
			t("file.warning"),
			"",
			rule,
			listHeading,
			rule,
			"",
			...numbered(".  "),
			"",
			rule,
			"",
		].join("\n");
	}

	function download(): void {
		const blob = new Blob([fileContents()], { type: "text/plain;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = FILENAME;
		link.click();
		URL.revokeObjectURL(url);
	}

	return (
		<div className="grid gap-4">
			<div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 dark:bg-destructive/10">
				<TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
				<p className="text-sm leading-relaxed">{t("warning")}</p>
			</div>

			<ol className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2">
				{codes.map((code, index) => (
					<li key={code} className="flex items-center gap-3 bg-card px-3 py-2.5">
						<span className="w-5 shrink-0 text-right text-muted-foreground text-xs tabular-nums">{index + 1}</span>
						<span className="font-mono text-sm tracking-wider">{code}</span>
					</li>
				))}
			</ol>

			<div className="flex flex-wrap gap-2">
				<Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
					{copied ? <Check /> : <Copy />}
					{copied ? t("copied") : t("copy")}
				</Button>
				<Button type="button" variant="outline" size="sm" onClick={download}>
					<Download />
					{t("download")}
				</Button>
			</div>
		</div>
	);
}
