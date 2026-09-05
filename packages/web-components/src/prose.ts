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
			// An unsafe scheme yields no href at all, so the label renders as text
			// rather than as a link that does something unexpected.
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

/**
 * Render prose content into a container element.
 *
 * Parsing comes from @mdocui/core, so this matches what the React renderer
 * produces for the same input.
 */
export function renderProse(content: string, dataKey: string): HTMLElement {
	const wrapper = document.createElement('span')
	wrapper.setAttribute('data-mdocui-prose', dataKey)

	const blocks = parseBlocks(content)
	if (blocks.length === 0) {
		wrapper.appendChild(document.createTextNode(content))
		return wrapper
	}

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
				fillInline(el, block.content ?? '')
				wrapper.appendChild(el)
			}
		}
	}

	return wrapper
}
