"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	confirmLabel: string;
	onConfirm: () => void;
	pending?: boolean;
	destructive?: boolean;
}

export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel,
	onConfirm,
	pending = false,
	destructive = false,
}: ConfirmDialogProps) {
	const t = useTranslations("common");

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						onConfirm();
					}}
				>
					<DialogFooter>
						<Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
							{t("cancel")}
						</Button>
						<Button type="submit" variant={destructive ? "destructive" : "default"} disabled={pending}>
							{confirmLabel}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
