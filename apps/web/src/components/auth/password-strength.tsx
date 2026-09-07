"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { evaluatePassword, PASSWORD_REQUIREMENTS, type PasswordLevel, passwordStrength } from "@/lib/password";
import { cn } from "@/lib/utils";

const LEVEL_COLOR: Record<PasswordLevel, string> = {
	weak: "var(--strength-weak)",
	fair: "var(--strength-fair)",
	good: "var(--strength-good)",
	strong: "var(--strength-strong)",
};

export function PasswordStrength({ password }: { password: string }) {
	const t = useTranslations("auth.password");
	const checks = evaluatePassword(password);
	const { score, level } = passwordStrength(password);
	const color = LEVEL_COLOR[level];
	const filled = password.length === 0 ? 0 : score;

	return (
		<div className="grid gap-2">
			<div aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
				<div
					className="h-full rounded-full transition-[width,background-color] duration-500 ease-out motion-reduce:transition-none"
					style={{ width: `${(filled / PASSWORD_REQUIREMENTS.length) * 100}%`, backgroundColor: color }}
				/>
			</div>
			<p
				role="status"
				aria-live="polite"
				className="text-xs transition-colors duration-500 motion-reduce:transition-none"
				style={{ color }}
			>
				<span className="text-muted-foreground">{t("strength")}: </span>
				{t(`level.${level}`)}
			</p>
			<ul className="grid gap-1">
				{PASSWORD_REQUIREMENTS.map((requirement) => (
					<li
						key={requirement}
						className={cn(
							"flex items-center gap-2 text-xs transition-colors duration-300 motion-reduce:transition-none",
							checks[requirement] ? "text-foreground" : "text-muted-foreground",
						)}
					>
						{checks[requirement] ? (
							<Check className="size-3 shrink-0" style={{ color: "var(--strength-strong)" }} />
						) : (
							<X className="size-3 shrink-0" />
						)}
						{t(`requirement.${requirement}`)}
					</li>
				))}
			</ul>
		</div>
	);
}
