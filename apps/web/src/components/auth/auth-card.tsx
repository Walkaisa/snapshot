import type { ReactNode } from "react";

import { Brand } from "@/components/layout/brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
	return (
		<Card className="w-full max-w-sm">
			<CardHeader>
				<div className="grid gap-4">
					<Brand />
					<div className="grid gap-1.5">
						<CardTitle>{title}</CardTitle>
						<CardDescription>{description}</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	);
}
