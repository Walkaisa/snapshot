"use client";

import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiKeyReveal } from "@/hooks/use-config";

export function KeyField({ id, masked }: { id?: string; masked: string }) {
	const t = useTranslations("settings.apiKey");
	const { data, refetch, isFetching } = useApiKeyReveal();
	const [revealed, setRevealed] = useState(false);
	const [copied, setCopied] = useState(false);

	async function ensureKey(): Promise<string> {
		if (data) {
			return data.apiKey;
		}

		const result = await refetch();

		if (!result.data) {
			throw result.error ?? new Error("reveal failed");
		}

		return result.data.apiKey;
	}

	async function toggleReveal(): Promise<void> {
		try {
			if (!revealed) {
				await ensureKey();
			}
			setRevealed((value) => !value);
		} catch {
			toast.error(t("revealError"));
		}
	}

	async function copy(): Promise<void> {
		try {
			const key = await ensureKey();
			await navigator.clipboard.writeText(key);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			toast.error(t("copyError"));
		}
	}

	const value = revealed && data ? data.apiKey : masked;

	return (
		<div className="flex items-center gap-2">
			<Input id={id} readOnly value={value} aria-label={t("label")} />
			<Button
				type="button"
				variant="outline"
				size="icon"
				onClick={toggleReveal}
				disabled={isFetching}
				aria-label={revealed ? t("hide") : t("reveal")}
			>
				{revealed ? <EyeOff /> : <Eye />}
			</Button>
			<Button type="button" variant="outline" size="icon" onClick={copy} aria-label={t("copy")}>
				{copied ? <Check /> : <Copy />}
			</Button>
		</div>
	);
}
