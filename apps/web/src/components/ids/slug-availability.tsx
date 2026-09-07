"use client";

import { Check, LoaderCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { useIdAvailability } from "@/hooks/use-ids";

const AVAILABILITY_DEBOUNCE_MS = 350;

function useDebounced(value: string, delay: number): string {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delay);

		return () => clearTimeout(timer);
	}, [value, delay]);

	return debounced;
}

export function SlugAvailability({ slug, isUsable }: { slug: string; isUsable: (value: string) => boolean }) {
	const t = useTranslations("ids.availability");
	const candidate = useDebounced(slug, AVAILABILITY_DEBOUNCE_MS);
	const usable = candidate.length > 0 && isUsable(candidate);
	const { data, isFetching, isError } = useIdAvailability(usable ? candidate : "");

	if (!usable || candidate !== slug || isFetching) {
		return usable ? <LoaderCircle className="size-4 animate-spin text-muted-foreground" aria-label={t("checking")} /> : null;
	}

	if (isError || data === undefined) {
		return null;
	}

	return data.available ? (
		<Check className="size-4" style={{ color: "var(--strength-strong)" }} aria-label={t("available")} />
	) : (
		<X className="size-4 text-destructive" aria-label={t(`taken.${data.occupiedBy ?? "reserved"}`)} />
	);
}
