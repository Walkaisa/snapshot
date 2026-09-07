import { LanguageCard } from "@/components/settings/language-card";
import { ThemeCard } from "@/components/settings/theme-card";

export default function AppearancePage() {
	return (
		<div className="grid gap-6">
			<ThemeCard />
			<LanguageCard />
		</div>
	);
}
