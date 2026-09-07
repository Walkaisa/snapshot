"use client";

import type { TotpEnrollment } from "@snapshot/contracts";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { QrCode } from "@/components/settings/qr-code";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function grouped(secret: string): string {
	return (secret.match(/.{1,4}/g) ?? [secret]).join(" ");
}

export function MfaSecret({ enrollment }: { enrollment: TotpEnrollment }) {
	const t = useTranslations("settings.mfa.enroll");
	const [copied, setCopied] = useState(false);

	async function copy(): Promise<void> {
		try {
			await navigator.clipboard.writeText(enrollment.secret);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			toast.error(t("copyError"));
		}
	}

	return (
		<div className="flex flex-col gap-6 sm:flex-row sm:items-start">
			<QrCode value={enrollment.otpauthUri} label={t("qrLabel")} className="mx-auto shrink-0 p-2.5 sm:mx-0" />
			<div className="flex min-w-0 flex-1 flex-col gap-3">
				<p className="text-muted-foreground text-sm leading-relaxed">{t("scanHint")}</p>
				<div className="flex flex-col gap-2">
					<label htmlFor="mfa-secret" className="font-medium text-sm">
						{t("secretLabel")}
					</label>
					<div className="flex items-center gap-2">
						<Input
							id="mfa-secret"
							readOnly
							value={grouped(enrollment.secret)}
							autoComplete="off"
							spellCheck={false}
							onFocus={(event) => event.target.select()}
							className="font-mono text-xs tracking-wider"
						/>
						<Button type="button" variant="outline" size="icon" onClick={() => void copy()} aria-label={t("copySecret")}>
							{copied ? <Check /> : <Copy />}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
