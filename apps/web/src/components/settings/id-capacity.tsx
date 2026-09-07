"use client";

import { effectiveIdMinimums, generateId, type IdMinimums, idCollisionHeadroom, idCombinations, idEntropyBits } from "@snapshot/contracts";
import { RotateCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatCompact, formatMagnitude } from "@/lib/format-count";

const LEVEL_THRESHOLDS = [
	{ bits: 80, level: "strong" },
	{ bits: 60, level: "good" },
	{ bits: 40, level: "fair" },
] as const;

const FULL_BAR_BITS = 96;

function levelOf(bits: number): string {
	return LEVEL_THRESHOLDS.find((threshold) => bits >= threshold.bits)?.level ?? "weak";
}

export function IdCapacity({ alphabet, length, minimums }: { alphabet: string; length: number; minimums: IdMinimums }) {
	const t = useTranslations("settings.ids.capacity");
	const locale = useLocale();

	const combinations = useMemo(() => idCombinations(alphabet, length, minimums), [alphabet, length, minimums]);
	const required = useMemo(() => effectiveIdMinimums(alphabet, minimums), [alphabet, minimums]);
	const bits = idEntropyBits(combinations);
	const level = levelOf(bits);
	const possible = combinations > 0;

	const draw = useCallback(
		() => (combinations > 0 ? generateId(alphabet, length, required) : ""),
		[alphabet, length, required, combinations],
	);

	const [example, setExample] = useState("");

	useEffect(() => {
		setExample(draw());
	}, [draw]);

	return (
		<div className="grid gap-4 rounded-lg border bg-muted/40 p-4">
			<dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<div className="grid min-w-0 gap-0.5">
					<dt className="text-muted-foreground text-xs">{t("example")}</dt>
					<dd className="flex items-center gap-2">
						<p className="min-w-0 flex-1 truncate font-mono text-lg leading-tight" aria-live="polite">
							{possible ? example : <span className="text-destructive text-sm">{t("impossible")}</span>}
						</p>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							onClick={() => setExample(draw())}
							disabled={!possible}
							aria-label={t("reroll")}
						>
							<RotateCw />
						</Button>
					</dd>
					<p className="text-muted-foreground text-xs">{t("exampleCaption", { count: alphabet.length })}</p>
				</div>
				<div className="grid gap-0.5">
					<dt className="text-muted-foreground text-xs">{t("combinations.label")}</dt>
					<dd className="font-semibold text-lg tabular-nums leading-tight">
						{possible ? formatMagnitude(combinations, locale) : "—"}
					</dd>
					<p className="text-muted-foreground text-xs">{t("combinations.caption")}</p>
				</div>
				<div className="grid gap-0.5">
					<dt className="text-muted-foreground text-xs">{t("headroom.label")}</dt>
					<dd className="font-semibold text-lg tabular-nums leading-tight">
						{possible ? formatCompact(idCollisionHeadroom(combinations), locale) : "—"}
					</dd>
					<p className="text-muted-foreground text-xs">{t("headroom.caption")}</p>
				</div>
			</dl>

			<div className="flex items-center gap-3 border-t pt-4">
				<div aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
					<div
						className="h-full rounded-full transition-[width,background-color] duration-500 ease-out motion-reduce:transition-none"
						style={{
							width: `${Math.min(bits / FULL_BAR_BITS, 1) * 100}%`,
							backgroundColor: `var(--strength-${level})`,
						}}
					/>
				</div>
				<span className="shrink-0 font-medium text-xs tabular-nums" style={{ color: `var(--strength-${level})` }}>
					{t("entropy", { bits: Math.floor(bits) })}
				</span>
			</div>
		</div>
	);
}
