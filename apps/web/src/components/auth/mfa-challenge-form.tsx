"use client";

import { KeyRound, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { CodeInput } from "@/components/auth/code-input";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useVerifySignInMfa } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/types";
import { DEFAULT_LANDING } from "@/lib/auth-gate";

export function MfaChallengeForm({ landing = DEFAULT_LANDING }: { landing?: string }) {
	const t = useTranslations("auth.mfa");
	const router = useRouter();
	const verify = useVerifySignInMfa();
	const [code, setCode] = useState("");
	const [recovery, setRecovery] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function submit(value: string): Promise<void> {
		if (value.trim().length === 0 || verify.isPending) {
			return;
		}

		setError(null);

		try {
			await verify.mutateAsync({ code: value });
			router.replace(landing);
		} catch (caught) {
			setCode("");

			if (caught instanceof ApiError && caught.status === 429) {
				setError(t("errors.throttled"));
				return;
			}

			setError(recovery ? t("errors.invalidRecoveryCode") : t("errors.invalidCode"));
		}
	}

	function switchMode(): void {
		setRecovery((value) => !value);
		setCode("");
		setError(null);
	}

	return (
		<form
			className="grid gap-6"
			onSubmit={(event) => {
				event.preventDefault();
				void submit(code);
			}}
		>
			<Field data-invalid={error !== null}>
				<FieldLabel htmlFor="mfa-code">{recovery ? t("fields.recoveryCode") : t("fields.code")}</FieldLabel>
				{recovery ? (
					<Input
						id="mfa-code"
						name="recovery-code"
						value={code}
						onChange={(event) => setCode(event.target.value)}
						autoComplete="one-time-code"
						autoCapitalize="characters"
						autoCorrect="off"
						spellCheck={false}
						placeholder="XXXXX-XXXXX"
						className="font-mono tracking-widest"
						aria-invalid={error !== null}
						aria-describedby={error !== null ? "mfa-code-error" : "mfa-code-hint"}
					/>
				) : (
					<CodeInput
						id="mfa-code"
						value={code}
						onChange={setCode}
						onComplete={(value) => void submit(value)}
						disabled={verify.isPending}
						invalid={error !== null}
						describedBy={error !== null ? "mfa-code-error" : "mfa-code-hint"}
						autoFocus
						size="lg"
					/>
				)}
				{error === null ? <FieldDescription id="mfa-code-hint">{recovery ? t("recoveryHint") : t("hint")}</FieldDescription> : null}
				{error !== null ? <FieldError id="mfa-code-error" errors={[{ message: error }]} /> : null}
			</Field>

			<Button type="submit" disabled={verify.isPending || code.trim().length === 0}>
				{verify.isPending ? t("verifying") : t("verify")}
			</Button>

			<div className="grid gap-4">
				<div className="relative">
					<Separator />
					<span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-muted-foreground text-xs">
						{t("or")}
					</span>
				</div>
				<div className="flex justify-center">
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-auto max-w-full whitespace-normal py-1.5 text-center"
						onClick={switchMode}
						disabled={verify.isPending}
					>
						{recovery ? <ShieldCheck /> : <KeyRound />}
						{recovery ? t("useAuthenticator") : t("useRecoveryCode")}
					</Button>
				</div>
			</div>
		</form>
	);
}
