import { describe, expect, it } from 'vitest'
import { Tokenizer, TokenizerState, TokenType } from '../src/tokenizer'

describe('Tokenizer', () => {
	it('emits prose for plain text', () => {
		const t = new Tokenizer()
		const tokens = t.write('Hello world')
		expect(tokens).toHaveLength(1)
		expect(tokens[0]).toEqual({ type: TokenType.PROSE, raw: 'Hello world' })
	})

	it('emits self-closing tag', () => {
		const t = new Tokenizer()
		const tokens = t.write('{% button action="go" /%}')
		expect(tokens).toHaveLength(1)
		expect(tokens[0].type).toBe(TokenType.TAG_SELF_CLOSE)
		expect(tokens[0].name).toBe('button')
		expect(tokens[0].attrs).toBe('action="go"')
		expect(tokens[0].selfClosing).toBe(true)
	})

	it('emits opening tag', () => {
		const t = new Tokenizer()
		const tokens = t.write('{% callout type="info" %}')
		expect(tokens).toHaveLength(1)
		expect(tokens[0].type).toBe(TokenType.TAG_OPEN)
		expect(tokens[0].name).toBe('callout')
		expect(tokens[0].selfClosing).toBe(false)
	})

	it('emits closing tag', () => {
		const t = new Tokenizer()
		const tokens = t.write('{% /callout %}')
		expect(tokens).toHaveLength(1)
		expect(tokens[0].type).toBe(TokenType.TAG_CLOSE)
		expect(tokens[0].name).toBe('callout')
	})

	it('handles mixed prose and tags', () => {
		const t = new Tokenizer()
		const tokens = t.write('Hello {% button /%} world')
		expect(tokens).toHaveLength(3)
		expect(tokens[0]).toEqual({ type: TokenType.PROSE, raw: 'Hello ' })
		expect(tokens[1].type).toBe(TokenType.TAG_SELF_CLOSE)
		expect(tokens[2]).toEqual({ type: TokenType.PROSE, raw: ' world' })
	})

	it('handles quotes inside tag attributes', () => {
		const t = new Tokenizer()
		const tokens = t.write('{% button label="Hello, %} world" /%}')
		expect(tokens).toHaveLength(1)
		expect(tokens[0].type).toBe(TokenType.TAG_SELF_CLOSE)
		expect(tokens[0].attrs).toBe('label="Hello, %} world"')
	})

	it('buffers incomplete tag across chunks', () => {
		const t = new Tokenizer()
		const t1 = t.write('Hello {% but')
		expect(t1).toHaveLength(1) // prose only
		expect(t.getState()).toBe(TokenizerState.IN_TAG)

		const t2 = t.write('ton /%}')
		expect(t2).toHaveLength(1)
		expect(t2[0].type).toBe(TokenType.TAG_SELF_CLOSE)
		expect(t2[0].name).toBe('button')
	})

	it('flush emits incomplete tag as prose', () => {
		const t = new Tokenizer()
		t.write('Hello {% incomplete')
		const tokens = t.flush()
		expect(tokens).toHaveLength(1)
		expect(tokens[0].type).toBe(TokenType.PROSE)
		expect(tokens[0].raw).toBe('{% incomplete')
	})

	it('handles single quotes in attributes', () => {
		const t = new Tokenizer()
		const tokens = t.write("{% button label='test %} value' /%}")
		expect(tokens).toHaveLength(1)
		expect(tokens[0].attrs).toBe("label='test %} value'")
	})

	it('handles empty tag gracefully', () => {
		const t = new Tokenizer()
		const tokens = t.write('{%  %}')
		expect(tokens).toHaveLength(0) // empty inner → dropped
	})

	it('handles escaped quotes inside attributes', () => {
		const t = new Tokenizer()
		const tokens = t.write('{% button label="say \\"hello\\"" /%}')
		expect(tokens).toHaveLength(1)
		expect(tokens[0].type).toBe(TokenType.TAG_SELF_CLOSE)
		expect(tokens[0].attrs).toContain('label=')
	})

	it('reset clears state', () => {
		const t = new Tokenizer()
		t.write('{% incomplete')
		t.reset()
		expect(t.getState()).toBe(TokenizerState.IN_PROSE)
		expect(t.getBuffer()).toBe('')
	})
})
