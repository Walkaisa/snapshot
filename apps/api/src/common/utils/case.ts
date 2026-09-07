export function toSnakeCase(value: string): string {
	return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function toCamelCase(value: string): string {
	return value.replace(/_([a-z0-9])/g, (_match, character: string) => character.toUpperCase());
}
