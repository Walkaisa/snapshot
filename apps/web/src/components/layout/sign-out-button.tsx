"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useSignOut } from "@/hooks/use-auth";

export function SignOutButton() {
	const auth = useTranslations("auth");
	const router = useRouter();
	const signOut = useSignOut();
	const label = signOut.isPending ? auth("signOut.loading") : auth("signOut.action");

	async function onSignOut(): Promise<void> {
		try {
			await signOut.mutateAsync();
			router.replace("/sign-in");
		} catch {
			toast.error(auth("errors.generic"));
		}
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<SidebarMenuButton
					type="button"
					variant="destructive"
					tooltip={label}
					disabled={signOut.isPending}
					onClick={() => void onSignOut()}
					className="justify-center"
				>
					<LogOut />
					<span>{label}</span>
				</SidebarMenuButton>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
