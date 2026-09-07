import { z } from "zod";

export const ID_MAX_LENGTH = 64;
export const ID_CHARACTER_PATTERN = /^[A-Za-z0-9_-]+$/;
export const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
export const ID_ALPHABET_MIN_SIZE = 8;
export const ID_MIN_OCCURRENCE_MAX = 16;

export const ID_CHARSETS = {
	lowercase: "abcdefghijklmnopqrstuvwxyz",
	uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
	digits: "0123456789",
	symbols: "-_",
} as const;

export const ID_CHARSET_KEYS = ["lowercase", "uppercase", "digits", "symbols"] as const;

export const idCharsetSchema = z.enum(ID_CHARSET_KEYS);
export type IdCharset = z.infer<typeof idCharsetSchema>;

export const RESERVED_IDS = [
	"overview",
	"audit",
	"gallery",
	"links",
	"uploads",
	"shortener",
	"rate-limit",
	"sharex",
	"api-key",
	"profile",
	"security",
	"appearance",
	"setup",
	"sign-in",
	"sign-out",
	"api",
	"raw",
	"healthz",
	"assets",
	"public",
	"static",
	"messages",
	"favicon",
	"robots",
	"sitemap",
] as const;

const reservedIds = new Set<string>(RESERVED_IDS);

export function isReservedId(value: string): boolean {
	return reservedIds.has(value.toLowerCase());
}

export const idSchema = z.string().regex(ID_PATTERN, {
	message: `Id must be 1-${ID_MAX_LENGTH} characters from A-Z, a-z, 0-9, hyphen or underscore`,
});

export const idOccupantSchema = z.enum(["reserved", "upload", "link"]);
export type IdOccupant = z.infer<typeof idOccupantSchema>;

export const idAvailabilitySchema = z.object({
	id: idSchema,
	available: z.boolean(),
	occupiedBy: idOccupantSchema.nullable(),
});
export type IdAvailability = z.infer<typeof idAvailabilitySchema>;

const charsetsAlphabetSchema = z.object({
	mode: z.literal("charsets"),
	charsets: z.array(idCharsetSchema).min(1, { message: "Select at least one character set" }),
});

const customAlphabetSchema = z.object({
	mode: z.literal("custom"),
	characters: z.string().trim().regex(ID_CHARACTER_PATTERN, {
		message: "Custom characters may only contain A-Z, a-z, 0-9, hyphen or underscore",
	}),
});

export type IdAlphabet = z.infer<typeof charsetsAlphabetSchema> | z.infer<typeof customAlphabetSchema>;

export function resolveIdAlphabet(alphabet: IdAlphabet): string {
	const source =
		alphabet.mode === "custom"
			? alphabet.characters
			: ID_CHARSET_KEYS.filter((key) => alphabet.charsets.includes(key))
					.map((key) => ID_CHARSETS[key])
					.join("");

	return [...new Set(source)].join("");
}

export interface IdCharacterClasses {
	digits: number;
	symbols: number;
	others: number;
}

export function countIdCharacterClasses(alphabet: string): IdCharacterClasses {
	let digits = 0;
	let symbols = 0;

	for (const character of alphabet) {
		if (ID_CHARSETS.digits.includes(character)) {
			digits += 1;
		} else if (ID_CHARSETS.symbols.includes(character)) {
			symbols += 1;
		}
	}

	return { digits, symbols, others: alphabet.length - digits - symbols };
}

export interface IdMinimums {
	digits: number;
	symbols: number;
}

export function effectiveIdMinimums(alphabet: string, minimums: IdMinimums): IdMinimums {
	const classes = countIdCharacterClasses(alphabet);

	return {
		digits: classes.digits > 0 ? minimums.digits : 0,
		symbols: classes.symbols > 0 ? minimums.symbols : 0,
	};
}

function binomial(total: number, chosen: number): number {
	if (chosen < 0 || chosen > total) {
		return 0;
	}

	let result = 1;

	for (let step = 0; step < chosen; step += 1) {
		result = (result * (total - step)) / (step + 1);
	}

	return result;
}

export interface IdComposition {
	digits: number;
	symbols: number;
	weight: number;
}

export function idCompositionWeights(alphabet: string, length: number, minimums: IdMinimums): IdComposition[] {
	const classes = countIdCharacterClasses(alphabet);
	const required = effectiveIdMinimums(alphabet, minimums);

	if (alphabet.length === 0 || length <= 0 || required.digits + required.symbols > length) {
		return [];
	}

	const compositions: IdComposition[] = [];

	for (let digits = required.digits; digits <= length; digits += 1) {
		for (let symbols = required.symbols; symbols <= length - digits; symbols += 1) {
			const others = length - digits - symbols;
			const weight =
				binomial(length, digits) *
				binomial(length - digits, symbols) *
				classes.digits ** digits *
				classes.symbols ** symbols *
				classes.others ** others;

			if (weight > 0) {
				compositions.push({ digits, symbols, weight });
			}
		}
	}

	return compositions;
}

export function idCombinations(alphabet: string, length: number, minimums: IdMinimums): number {
	return idCompositionWeights(alphabet, length, minimums).reduce((total, composition) => total + composition.weight, 0);
}

export function idEntropyBits(combinations: number): number {
	return combinations > 1 ? Math.log2(combinations) : 0;
}

export function idCollisionHeadroom(combinations: number): number {
	return combinations > 0 ? Math.floor(Math.sqrt(combinations)) : 0;
}

export const idAlphabetSchema = z
	.discriminatedUnion("mode", [charsetsAlphabetSchema, customAlphabetSchema])
	.superRefine((alphabet, ctx) => {
		if (resolveIdAlphabet(alphabet).length < ID_ALPHABET_MIN_SIZE) {
			ctx.addIssue({
				code: "custom",
				path: alphabet.mode === "custom" ? ["characters"] : ["charsets"],
				message: `Ids need an alphabet of at least ${ID_ALPHABET_MIN_SIZE} distinct characters`,
			});
		}
	});

export interface IdShape {
	alphabet: IdAlphabet;
	length: number;
	minimums: IdMinimums;
}

const UINT32_MAX = 0xffffffff;

function randomBelow(bound: number): number {
	if (bound <= 1) {
		return 0;
	}

	const limit = Math.floor((UINT32_MAX + 1) / bound) * bound;
	const buffer = new Uint32Array(1);
	let value = limit;

	while (value >= limit) {
		crypto.getRandomValues(buffer);
		value = buffer[0] as number;
	}

	return value % bound;
}

function randomUnit(): number {
	const buffer = new Uint32Array(2);
	crypto.getRandomValues(buffer);

	return (((buffer[0] as number) >>> 5) * 2 ** 26 + ((buffer[1] as number) >>> 6)) / 2 ** 53;
}

function pick(pool: string): string {
	return pool[randomBelow(pool.length)] as string;
}

function shuffle(items: string[]): string[] {
	for (let index = items.length - 1; index > 0; index -= 1) {
		const swap = randomBelow(index + 1);
		[items[index], items[swap]] = [items[swap] as string, items[index] as string];
	}

	return items;
}

export function generateId(alphabet: string, length: number, minimums: IdMinimums): string {
	const compositions = idCompositionWeights(alphabet, length, minimums);

	if (compositions.length === 0) {
		throw new Error("The configured id shape cannot produce an id");
	}

	const total = compositions.reduce((sum, composition) => sum + composition.weight, 0);
	let cursor = randomUnit() * total;
	let chosen = compositions[compositions.length - 1] as IdComposition;

	for (const composition of compositions) {
		cursor -= composition.weight;

		if (cursor < 0) {
			chosen = composition;
			break;
		}
	}

	const digits = [...alphabet].filter((character) => ID_CHARSETS.digits.includes(character)).join("");
	const symbols = [...alphabet].filter((character) => ID_CHARSETS.symbols.includes(character)).join("");
	const others = [...alphabet].filter((character) => !digits.includes(character) && !symbols.includes(character)).join("");
	const characters: string[] = [];

	for (let index = 0; index < chosen.digits; index += 1) {
		characters.push(pick(digits));
	}

	for (let index = 0; index < chosen.symbols; index += 1) {
		characters.push(pick(symbols));
	}

	for (let index = characters.length; index < length; index += 1) {
		characters.push(pick(others));
	}

	return shuffle(characters).join("");
}

export function generateUnreservedId(shape: IdShape): string {
	const alphabet = resolveIdAlphabet(shape.alphabet);
	const minimums = effectiveIdMinimums(alphabet, shape.minimums);
	let id = generateId(alphabet, shape.length, minimums);

	while (isReservedId(id)) {
		id = generateId(alphabet, shape.length, minimums);
	}

	return id;
}
