"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { useSignOut } from "@/hooks/use-auth";

export default function SignOutPage() {
	const t = useTranslations("auth");
	const router = useRouter();
	const signOut = useSignOut();
	const started = useRef(false);

	useEffect(() => {
		if (started.current) {
			return;
		}
		started.current = true;

		signOut
			.mutateAsync()
			.catch(() => undefined)
			.finally(() => router.replace("/sign-in"));
	}, [router, signOut]);

	return <p className="text-muted-foreground text-sm">{t("signOut.loading")}</p>;
}
