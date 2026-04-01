export enum TokenizerState {
	IN_PROSE = 'IN_PROSE',
	IN_TAG = 'IN_TAG',
	IN_STRING = 'IN_STRING',
}

export enum TokenType {
	PROSE = 'PROSE',
	TAG_OPEN = 'TAG_OPEN',
	TAG_SELF_CLOSE = 'TAG_SELF_CLOSE',
	TAG_CLOSE = 'TAG_CLOSE',
}

export interface Token {
	type: TokenType
	raw: string
	name?: string
	attrs?: string
	selfClosing?: boolean
}

export class Tokenizer {
	private state: TokenizerState = TokenizerState.IN_PROSE
	private buffer = ''
	private proseBuffer = ''
	private stringChar: string | null = null
	private escaped = false
	private tokens: Token[] = []

	getState(): TokenizerState {
		return this.state
	}

	getBuffer(): string {
		return this.buffer
	}

	write(chunk: string): Token[] {
		this.tokens = []

		for (let i = 0; i < chunk.length; i++) {
			const char = chunk[i]
			const next = chunk[i + 1]

			switch (this.state) {
				case TokenizerState.IN_PROSE:
					if (char === '{' && next === '%') {
						this.flushProse()
						this.buffer = '{%'
						this.state = TokenizerState.IN_TAG
						i++
					} else {
						this.proseBuffer += char
					}
					break

				case TokenizerState.IN_TAG:
					this.buffer += char
					if (char === '"' || char === "'") {
						this.stringChar = char
						this.escaped = false
						this.state = TokenizerState.IN_STRING
					} else if (char === '%' && next === '}') {
						this.buffer += '}'
						i++
						this.emitTag()
						this.state = TokenizerState.IN_PROSE
					}
					break

				case TokenizerState.IN_STRING:
					this.buffer += char
					if (this.escaped) {
						this.escaped = false
					} else if (char === '\\') {
						this.escaped = true
					} else if (char === this.stringChar) {
						this.stringChar = null
						this.state = TokenizerState.IN_TAG
					}
					break
			}
		}

		if (this.state === TokenizerState.IN_PROSE) {
			this.flushProse()
		}

		return this.tokens
	}

	flush(): Token[] {
		this.tokens = []

		if (this.state === TokenizerState.IN_TAG || this.state === TokenizerState.IN_STRING) {
			this.proseBuffer += this.buffer
			this.buffer = ''
			this.state = TokenizerState.IN_PROSE
		}

		this.flushProse()
		return this.tokens
	}

	reset(): void {
		this.state = TokenizerState.IN_PROSE
		this.buffer = ''
		this.proseBuffer = ''
		this.stringChar = null
		this.escaped = false
		this.tokens = []
	}

	private flushProse(): void {
		if (this.proseBuffer.length > 0) {
			this.tokens.push({ type: TokenType.PROSE, raw: this.proseBuffer })
			this.proseBuffer = ''
		}
	}

	private emitTag(): void {
		const raw = this.buffer
		this.buffer = ''

		const inner = raw.slice(2, -2).trim()
		if (inner.length === 0) return

		if (inner.startsWith('/')) {
			this.tokens.push({ type: TokenType.TAG_CLOSE, raw, name: inner.slice(1).trim().split(/\s/)[0] })
			return
		}

		const selfClosing = inner.endsWith('/')
		const content = selfClosing ? inner.slice(0, -1).trim() : inner
		const wsMatch = content.match(/\s/)
		const wsIdx = wsMatch?.index ?? -1

		this.tokens.push({
			type: selfClosing ? TokenType.TAG_SELF_CLOSE : TokenType.TAG_OPEN,
			raw,
			name: wsIdx === -1 ? content : content.slice(0, wsIdx),
			attrs: wsIdx === -1 ? '' : content.slice(wsIdx + 1).trim(),
			selfClosing,
		})
	}
}
