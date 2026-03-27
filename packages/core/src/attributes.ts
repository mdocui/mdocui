const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

export function parseAttributes(input: string): Record<string, unknown> {
	const result = Object.create(null) as Record<string, unknown>
	let i = 0

	while (i < input.length) {
		while (i < input.length && isWhitespace(input[i])) i++
		if (i >= input.length) break

		const keyStart = i
		while (i < input.length && input[i] !== '=' && !isWhitespace(input[i])) i++
		const key = input.slice(keyStart, i)
		if (key.length === 0) break

		if (UNSAFE_KEYS.has(key)) {
			// skip past the value if there is one
			while (i < input.length && isWhitespace(input[i])) i++
			if (i < input.length && input[i] === '=') {
				i++
				i = skipValue(input, i)
			}
			continue
		}

		while (i < input.length && isWhitespace(input[i])) i++

		if (i >= input.length || input[i] !== '=') {
			result[key] = true
			continue
		}
		i++ // skip =
		while (i < input.length && isWhitespace(input[i])) i++

		if (i >= input.length) {
			result[key] = true
			break
		}

		const char = input[i]

		if (char === '"' || char === "'") {
			const quote = char
			i++
			let value = ''
			while (i < input.length && input[i] !== quote) {
				if (input[i] === '\\' && i + 1 < input.length) {
					value += input[i + 1]
					i += 2
				} else {
					value += input[i]
					i++
				}
			}
			if (i < input.length) i++ // skip closing quote
			result[key] = value
		} else if (char === '[') {
			const start = i
			let depth = 1
			i++
			let inStr = false
			let strChar = ''
			let escaped = false
			while (i < input.length && depth > 0) {
				if (inStr) {
					if (escaped) {
						escaped = false
					} else if (input[i] === '\\') {
						escaped = true
					} else if (input[i] === strChar) {
						inStr = false
					}
				} else {
					if (input[i] === '"' || input[i] === "'") {
						inStr = true
						strChar = input[i]
					} else if (input[i] === '[') {
						depth++
					} else if (input[i] === ']') {
						depth--
					}
				}
				i++
			}
			const raw = input.slice(start, i)
			try {
				result[key] = JSON.parse(raw)
			} catch {
				result[key] = raw
			}
		} else {
			const valStart = i
			while (i < input.length && !isWhitespace(input[i])) i++
			const raw = input.slice(valStart, i)
			result[key] = coerce(raw)
		}
	}

	return result
}

function skipValue(input: string, start: number): number {
	let pos = start
	while (pos < input.length && isWhitespace(input[pos])) pos++
	if (pos >= input.length) return pos

	const ch = input[pos]
	if (ch === '"' || ch === "'") {
		pos++
		while (pos < input.length && input[pos] !== ch) {
			if (input[pos] === '\\') pos++
			pos++
		}
		if (pos < input.length) pos++
	} else if (ch === '[') {
		let depth = 1
		pos++
		while (pos < input.length && depth > 0) {
			if (input[pos] === '[') depth++
			else if (input[pos] === ']') depth--
			pos++
		}
	} else {
		while (pos < input.length && !isWhitespace(input[pos])) pos++
	}
	return pos
}

function isWhitespace(ch: string): boolean {
	return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r'
}

function coerce(raw: string): unknown {
	if (raw === 'true') return true
	if (raw === 'false') return false
	if (raw === 'null') return null
	const num = Number(raw)
	if (!Number.isNaN(num) && raw.length > 0) return num
	return raw
}
