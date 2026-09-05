import { describe, expect, it } from 'vitest'
import { allDefinitions } from '../src/definitions'
import { StreamingParser } from '../src/parser'
import { ComponentRegistry } from '../src/registry'
import { Tokenizer } from '../src/tokenizer'

/**
 * A streaming parser owes its callers one guarantee: how the input is split
 * must not change what comes out. Chunk boundaries are decided by the network
 * and the model, not by the caller.
 *
 * Fixtures are shaped like real model output. Both delimiters are two
 * characters, so any chunking can split one.
 */

const registry = new ComponentRegistry()
registry.registerAll(allDefinitions)
const knownTags = registry.knownTags()

const FIXTURES: Record<string, string> = {
	prose: 'Just **bold** prose with a [link](https://x.com) and no tags at all.',
	selfClosing: 'Before {% button action="go" label="Go" /%} after.',
	body: '{% callout type="warning" title="T" %}\nBody text.\n{% /callout %}',
	nested: `{% card title="C" %}
  {% grid cols=3 %}
    {% stat label="A" value="1" /%}
    {% stat label="B" value="2" /%}
  {% /grid %}
  {% divider /%}
  {% chart type="bar" labels=["Oct","Nov"] values=[1.4, 1.6] /%}
{% /card %}`,
	multilineArray: `{% table headers=["P","R"] rows=[
  ["Aurora", "$612,500"],
  ["Nimbus", "$498,250"]
] /%}`,
	bracesInProse: 'Use { and % separately, and {not a tag} and 100% done.',
	stringWithDelimiters: '{% badge label="literal {% and %} inside" /%}',
	adjacent: '{% divider /%}{% divider /%}{% divider /%}',
}

function parseInChunks(input: string, size: number) {
	const parser = new StreamingParser({ knownTags })
	for (let i = 0; i < input.length; i += size) parser.write(input.slice(i, i + size))
	parser.flush()
	return { nodes: parser.getNodes(), errors: parser.getMeta().errors }
}

function parseAtBoundaries(input: string, boundaries: number[]) {
	const parser = new StreamingParser({ knownTags })
	let prev = 0
	for (const b of [...boundaries, input.length]) {
		if (b > prev) parser.write(input.slice(prev, b))
		prev = b
	}
	parser.flush()
	return { nodes: parser.getNodes(), errors: parser.getMeta().errors }
}

// Deterministic PRNG so a failure reproduces exactly.
function rng(seed: number) {
	let s = seed
	return () => {
		s = (s * 1664525 + 1013904223) % 4294967296
		return s / 4294967296
	}
}

describe('chunking does not change the result', () => {
	for (const [name, input] of Object.entries(FIXTURES)) {
		it(`${name}: every fixed chunk size matches whole-string parsing`, () => {
			const expected = parseInChunks(input, input.length || 1)
			for (const size of [1, 2, 3, 4, 5, 7, 8, 11, 16, 32, 64, 128]) {
				const actual = parseInChunks(input, size)
				expect(actual.nodes, `chunk size ${size}`).toEqual(expected.nodes)
				expect(actual.errors, `chunk size ${size}`).toEqual(expected.errors)
			}
		})

		it(`${name}: random chunk boundaries match whole-string parsing`, () => {
			const expected = parseInChunks(input, input.length || 1)
			for (let seed = 1; seed <= 40; seed++) {
				const rand = rng(seed)
				const boundaries: number[] = []
				let at = 0
				while (at < input.length) {
					at += 1 + Math.floor(rand() * 6)
					if (at < input.length) boundaries.push(at)
				}
				const actual = parseAtBoundaries(input, boundaries)
				expect(actual.nodes, `seed ${seed} boundaries ${boundaries.join(',')}`).toEqual(
					expected.nodes,
				)
			}
		})
	}

	it('splits the opening delimiter across a chunk boundary', () => {
		const parser = new StreamingParser({ knownTags })
		parser.write('text {')
		parser.write('% divider /%}')
		parser.flush()
		const kinds = parser.getNodes().map((n) => n.type)
		expect(kinds).toContain('component')
		expect(parser.getMeta().errors).toEqual([])
	})

	it('splits the closing delimiter across a chunk boundary', () => {
		const parser = new StreamingParser({ knownTags })
		parser.write('{% divider /%')
		parser.write('}')
		parser.flush()
		expect(parser.getNodes().some((n) => n.type === 'component')).toBe(true)
		expect(parser.getMeta().errors).toEqual([])
	})

	it('keeps a trailing brace as prose when the stream ends', () => {
		const parser = new StreamingParser({ knownTags })
		parser.write('done {')
		parser.flush()
		const prose = parser
			.getNodes()
			.filter((n) => n.type === 'prose')
			.map((n) => (n as { content: string }).content)
			.join('')
		expect(prose).toBe('done {')
	})
})

describe('Tokenizer across chunk boundaries', () => {
	it('holds a trailing brace rather than emitting it as prose', () => {
		const t = new Tokenizer()
		const first = t.write('a {')
		expect(first.map((x) => x.raw).join('')).toBe('a ')
		const second = t.write('% divider /%}')
		expect(second.some((x) => x.type === 'TAG_SELF_CLOSE')).toBe(true)
	})

	it('emits a held brace on flush when nothing follows', () => {
		const t = new Tokenizer()
		t.write('a {')
		const out = t.flush()
		expect(out.map((x) => x.raw).join('')).toBe('{')
	})

	it('is reusable after reset', () => {
		const t = new Tokenizer()
		t.write('x {')
		t.reset()
		const out = t.write('{% divider /%}')
		expect(out.some((x) => x.type === 'TAG_SELF_CLOSE')).toBe(true)
	})
})
