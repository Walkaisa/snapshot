import { cn } from "@/lib/utils";

type JsonTokenKind = "key" | "string" | "number" | "literal";

interface JsonToken {
	offset: number;
	text: string;
	kind: JsonTokenKind | "plain";
}

const JSON_TOKEN_PATTERN = /("(?:[^"\\]|\\.)*")(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

const TOKEN_CLASSES: Record<JsonTokenKind, string> = {
	key: "text-sky-700 dark:text-sky-400",
	string: "text-emerald-700 dark:text-emerald-400",
	number: "text-amber-700 dark:text-amber-400",
	literal: "text-purple-700 dark:text-purple-400",
};

function tokenizeJson(source: string): JsonToken[] {
	const tokens: JsonToken[] = [];
	let cursor = 0;

	for (const match of source.matchAll(JSON_TOKEN_PATTERN)) {
		if (match.index > cursor) {
			tokens.push({ offset: cursor, text: source.slice(cursor, match.index), kind: "plain" });
		}

		if (match[1] !== undefined) {
			tokens.push({ offset: match.index, text: match[1], kind: match[2] === undefined ? "string" : "key" });
			if (match[2] !== undefined) {
				tokens.push({ offset: match.index + match[1].length, text: match[2], kind: "plain" });
			}
		} else if (match[0] === "true" || match[0] === "false" || match[0] === "null") {
			tokens.push({ offset: match.index, text: match[0], kind: "literal" });
		} else {
			tokens.push({ offset: match.index, text: match[0], kind: "number" });
		}

		cursor = match.index + match[0].length;
	}

	if (cursor < source.length) {
		tokens.push({ offset: cursor, text: source.slice(cursor), kind: "plain" });
	}

	return tokens;
}

export function JsonCode({ source, className }: { source: string; className?: string }) {
	return (
		<pre className={cn("overflow-x-auto font-mono text-muted-foreground text-xs leading-relaxed", className)}>
			<code>
				{tokenizeJson(source).map((token) =>
					token.kind === "plain" ? (
						token.text
					) : (
						<span key={token.offset} className={TOKEN_CLASSES[token.kind]}>
							{token.text}
						</span>
					),
				)}
			</code>
		</pre>
	);
}
