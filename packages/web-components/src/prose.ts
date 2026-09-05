import { type InlineToken, parseBlocks, parseInline, sanitizeHref } from '@mdocui/core'

function inlineNode(token: InlineToken): Node {
	const text = document.createTextNode(token.content)

	switch (token.type) {
		case 'bolditalic': {
			const strong = document.createElement('strong')
			const em = document.createElement('em')
			em.appendChild(text)
			strong.appendChild(em)
			return strong
		}
		case 'bold': {
			const el = document.createElement('strong')
			el.appendChild(text)
			return el
		}
		case 'italic': {
			const el = document.createElement('em')
			el.appendChild(text)
			return el
		}
		case 'strikethrough': {
			const el = document.createElement('del')
			el.appendChild(text)
			return el
		}
		case 'code': {
			const el = document.createElement('code')
			el.appendChild(text)
			return el
		}
		case 'link': {
			const href = sanitizeHref(token.href)
			// No href means an unsafe scheme, so render the label as plain text.
			if (!href) return text
			const el = document.createElement('a')
			el.setAttribute('href', href)
			el.setAttribute('target', '_blank')
			el.setAttribute('rel', 'noopener noreferrer')
			el.appendChild(text)
			return el
		}
		default:
			return text
	}
}

function fillInline(parent: Node, text: string): void {
	for (const token of parseInline(text)) parent.appendChild(inlineNode(token))
}

/** Parsing lives in core, so this matches what the React renderer produces. */
export function renderProse(content: string): HTMLElement {
	const blocks = parseBlocks(content)

	// No blocks means no block-level children, so a span is fine. Otherwise it
	// has to be a div: a span holding a <p> or a <ul> is invalid HTML.
	if (blocks.length === 0) {
		const span = document.createElement('span')
		span.setAttribute('data-mdocui-prose', 'true')
		span.appendChild(document.createTextNode(content))
		return span
	}

	const wrapper = document.createElement('div')
	wrapper.setAttribute('data-mdocui-prose', 'true')

	for (const block of blocks) {
		switch (block.type) {
			case 'heading': {
				const el = document.createElement(`h${block.level ?? 1}`)
				fillInline(el, block.content ?? '')
				wrapper.appendChild(el)
				break
			}
			case 'ulist':
			case 'olist': {
				const list = document.createElement(block.type === 'ulist' ? 'ul' : 'ol')
				list.style.margin = '0.25em 0'
				list.style.paddingLeft = '1.5em'
				for (const item of block.items ?? []) {
					const li = document.createElement('li')
					fillInline(li, item)
					list.appendChild(li)
				}
				wrapper.appendChild(list)
				break
			}
			default: {
				const el = document.createElement('p')
				el.style.margin = '0.25em 0'
				const text = block.content ?? ''
				// A newline inside a paragraph is a line break, not a new block.
				const lines = text.split('\n')
				lines.forEach((line, i) => {
					fillInline(el, line)
					if (i < lines.length - 1) el.appendChild(document.createElement('br'))
				})
				wrapper.appendChild(el)
			}
		}
	}

	return wrapper
}
