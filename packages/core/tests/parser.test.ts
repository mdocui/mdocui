import { describe, expect, it } from 'vitest'
import { StreamingParser } from '../src/parser'
import type { ComponentNode, ProseNode } from '../src/types'

const knownTags = new Set(['button', 'callout', 'card', 'chart', 'grid', 'stat', 'table'])

describe('StreamingParser', () => {
	it('parses prose-only input', () => {
		const p = new StreamingParser({ knownTags })
		const nodes = p.write('Hello **world**')
		expect(nodes).toHaveLength(1)
		expect(nodes[0].type).toBe('prose')
		expect((nodes[0] as ProseNode).content).toBe('Hello **world**')
	})

	it('parses self-closing tag', () => {
		const p = new StreamingParser({ knownTags })
		const nodes = p.write('{% button action="continue" label="Click me" /%}')
		expect(nodes).toHaveLength(1)
		const node = nodes[0] as ComponentNode
		expect(node.type).toBe('component')
		expect(node.name).toBe('button')
		expect(node.props).toEqual({ action: 'continue', label: 'Click me' })
		expect(node.selfClosing).toBe(true)
		expect(node.children).toEqual([])
	})

	it('parses tag with body', () => {
		const p = new StreamingParser({ knownTags })
		const nodes = p.write('{% callout type="info" %}Important message{% /callout %}')
		expect(nodes).toHaveLength(1)
		const node = nodes[0] as ComponentNode
		expect(node.type).toBe('component')
		expect(node.name).toBe('callout')
		expect(node.props).toEqual({ type: 'info' })
		expect(node.selfClosing).toBe(false)
		expect(node.children).toHaveLength(1)
		expect((node.children[0] as ProseNode).content).toBe('Important message')
	})

	it('parses mixed prose and tags', () => {
		const p = new StreamingParser({ knownTags })
		const input =
			'Revenue grew **12%**.\n\n{% chart type="bar" /%}\n\nWant more?\n\n{% button action="continue" label="Yes" /%}'
		const nodes = p.write(input)
		expect(nodes).toHaveLength(4)
		expect(nodes[0].type).toBe('prose')
		expect(nodes[1].type).toBe('component')
		expect((nodes[1] as ComponentNode).name).toBe('chart')
		expect(nodes[2].type).toBe('prose')
		expect(nodes[3].type).toBe('component')
		expect((nodes[3] as ComponentNode).name).toBe('button')
	})

	it('silently drops unknown tags', () => {
		const p = new StreamingParser({ knownTags })
		const nodes = p.write('Hello {% unknown /%} world')
		// unknown tag is dropped, but prose around it still flows
		expect(nodes).toHaveLength(2)
		expect((nodes[0] as ProseNode).content).toBe('Hello ')
		expect((nodes[1] as ProseNode).content).toBe(' world')
	})

	it('handles incomplete tag across chunks', () => {
		const p = new StreamingParser({ knownTags })
		const n1 = p.write('Hello {% but')
		expect(n1).toHaveLength(1) // prose "Hello "
		expect((n1[0] as ProseNode).content).toBe('Hello ')

		const n2 = p.write('ton action="go" /%} done')
		expect(n2).toHaveLength(2)
		expect(n2[0].type).toBe('component')
		expect((n2[0] as ComponentNode).name).toBe('button')
		expect(n2[1].type).toBe('prose')
	})

	it('handles multi-chunk streaming of body tag', () => {
		const p = new StreamingParser({ knownTags })

		const n1 = p.write('{% callout type="info" %}')
		expect(n1).toHaveLength(0) // opening tag, body not closed yet

		const n2 = p.write('Hello ')
		expect(n2).toHaveLength(0) // still in body

		const n3 = p.write('world{% /callout %}')
		expect(n3).toHaveLength(1)
		const node = n3[0] as ComponentNode
		expect(node.name).toBe('callout')
		expect(node.children).toHaveLength(1)
		expect((node.children[0] as ProseNode).content).toBe('Hello world')
	})

	it('merges consecutive prose across multiple write() calls', () => {
		const p = new StreamingParser({ knownTags })
		const chunks = ['Hello ', 'world, ', 'here is ', 'your ', 'visibility ', 'report.']

		for (const chunk of chunks) {
			p.write(chunk)
		}
		p.flush()

		const nodes = p.getNodes()
		const proseNodes = nodes.filter((n) => n.type === 'prose')
		expect(proseNodes).toHaveLength(1)
		expect((proseNodes[0] as ProseNode).content).toBe(
			'Hello world, here is your visibility report.',
		)
	})

	it('does not mutate previously-returned prose nodes on subsequent write()', () => {
		const p = new StreamingParser({ knownTags })
		p.write('Hello ')
		const nodesAfterFirst = p.getNodes()
		const firstRef = nodesAfterFirst[0] as ProseNode
		const originalContent = firstRef.content

		p.write('world')
		// The original reference should NOT have been mutated
		expect(firstRef.content).toBe(originalContent)

		// But getNodes() should return the merged content
		const nodesAfterSecond = p.getNodes()
		expect((nodesAfterSecond[0] as ProseNode).content).toBe('Hello world')
	})

	it('merges prose in flush() when last completed node is prose', () => {
		const p = new StreamingParser({ knownTags })
		p.write('Hello ')
		// Write a partial tag that the tokenizer buffers
		p.write('{% but')
		// flush() should emit the buffered text as prose and merge with "Hello "
		p.flush()

		const nodes = p.getNodes()
		const proseNodes = nodes.filter((n) => n.type === 'prose')
		// The buffered text should merge with prior prose
		expect(proseNodes.length).toBeGreaterThanOrEqual(1)
	})

	it('does not merge prose across component boundaries', () => {
		const p = new StreamingParser({ knownTags })
		p.write('Before ')
		p.write('{% button action="go" label="Click" /%}')
		p.write('After')
		p.flush()

		const nodes = p.getNodes()
		expect(nodes).toHaveLength(3)
		expect(nodes[0].type).toBe('prose')
		expect((nodes[0] as ProseNode).content).toBe('Before ')
		expect(nodes[1].type).toBe('component')
		expect(nodes[2].type).toBe('prose')
		expect((nodes[2] as ProseNode).content).toBe('After')
	})

	it('merges prose within body tags across chunks', () => {
		const p = new StreamingParser({ knownTags })
		p.write('{% card title="Test" %}')
		p.write('Line one ')
		p.write('continues here.')
		p.write('{% /card %}')
		p.flush()

		const nodes = p.getNodes()
		expect(nodes).toHaveLength(1)
		const card = nodes[0] as ComponentNode
		expect(card.children).toHaveLength(1)
		expect((card.children[0] as ProseNode).content).toBe('Line one continues here.')
	})

	it('force-closes open tags on flush', () => {
		const p = new StreamingParser({ knownTags })
		p.write('{% callout type="info" %}Some content')
		const flushed = p.flush()
		expect(flushed).toHaveLength(1)
		expect((flushed[0] as ComponentNode).name).toBe('callout')
	})

	it('nested tags in body', () => {
		const p = new StreamingParser({ knownTags })
		const nodes = p.write(
			'{% callout type="info" %}Click here: {% button action="go" /%}{% /callout %}',
		)
		expect(nodes).toHaveLength(1)
		const callout = nodes[0] as ComponentNode
		expect(callout.children).toHaveLength(2)
		expect(callout.children[0].type).toBe('prose')
		expect(callout.children[1].type).toBe('component')
		expect((callout.children[1] as ComponentNode).name).toBe('button')
	})

	it('allows all tags when knownTags is empty', () => {
		const p = new StreamingParser() // no knownTags filter
		const nodes = p.write('{% anything foo="bar" /%}')
		expect(nodes).toHaveLength(1)
		expect((nodes[0] as ComponentNode).name).toBe('anything')
	})

	it('getNodes returns all accumulated nodes', () => {
		const p = new StreamingParser({ knownTags })
		p.write('Hello ')
		p.write('{% button /%}')
		p.write(' world')
		expect(p.getNodes()).toHaveLength(3)
	})

	it('reset clears all state', () => {
		const p = new StreamingParser({ knownTags })
		p.write('Hello {% button /%}')
		p.reset()
		expect(p.getNodes()).toHaveLength(0)
	})

	describe('getMeta', () => {
		it('tracks unknown tag errors', () => {
			const p = new StreamingParser({ knownTags })
			p.write('{% unknown /%}')
			const meta = p.getMeta()
			expect(meta.errors).toHaveLength(1)
			expect(meta.errors[0].code).toBe('unknown_tag')
			expect(meta.errors[0].tagName).toBe('unknown')
		})

		it('tracks unclosed tag errors on flush', () => {
			const p = new StreamingParser({ knownTags })
			p.write('{% callout type="info" %}content')
			p.flush()
			const meta = p.getMeta()
			expect(meta.errors).toHaveLength(1)
			expect(meta.errors[0].code).toBe('unclosed')
			expect(meta.errors[0].tagName).toBe('callout')
		})

		it('tracks orphan closing tag errors', () => {
			const p = new StreamingParser({ knownTags })
			p.write('{% /callout %}')
			const meta = p.getMeta()
			expect(meta.errors).toHaveLength(1)
			expect(meta.errors[0].code).toBe('malformed')
		})

		it('reports nodeCount', () => {
			const p = new StreamingParser({ knownTags })
			p.write('Hello {% button /%} world')
			expect(p.getMeta().nodeCount).toBe(3)
		})

		it('reports isComplete when no open tags', () => {
			const p = new StreamingParser({ knownTags })
			p.write('Hello')
			expect(p.getMeta().isComplete).toBe(true)

			p.reset()
			p.write('{% callout %}body')
			expect(p.getMeta().isComplete).toBe(false)
		})

		it('reset clears errors', () => {
			const p = new StreamingParser({ knownTags })
			p.write('{% unknown /%}')
			expect(p.getMeta().errors).toHaveLength(1)
			p.reset()
			expect(p.getMeta().errors).toHaveLength(0)
		})

		it('exposes pendingTag when tokenizer is buffering a tag', () => {
			const p = new StreamingParser({ knownTags })
			p.write('Hello {% chart labels=[')
			const meta = p.getMeta()
			expect(meta.isComplete).toBe(false)
			expect(meta.pendingTag).toBe('chart')
			expect(meta.bufferLength).toBeGreaterThan(0)
		})

		it('pendingTag is undefined when not buffering', () => {
			const p = new StreamingParser({ knownTags })
			p.write('Hello world')
			const meta = p.getMeta()
			expect(meta.isComplete).toBe(true)
			expect(meta.pendingTag).toBeUndefined()
			expect(meta.bufferLength).toBeUndefined()
		})

		it('pendingTag clears after tag completes', () => {
			const p = new StreamingParser({ knownTags })
			p.write('{% chart labels=["A"]')
			expect(p.getMeta().pendingTag).toBe('chart')

			p.write(' values=[1] /%}')
			expect(p.getMeta().pendingTag).toBeUndefined()
			expect(p.getMeta().isComplete).toBe(true)
		})

		it('handles trailing slash in pendingTag extraction', () => {
			const p = new StreamingParser({ knownTags })
			p.write('{% button/')
			expect(p.getMeta().pendingTag).toBe('button')
		})

		it('pendingTag is undefined for closing tags', () => {
			const p = new StreamingParser({ knownTags })
			p.write('{% callout %}body{% /cal')
			const meta = p.getMeta()
			expect(meta.pendingTag).toBeUndefined()
		})
	})

	describe('multiline tags', () => {
		it('parses self-closing tag split across lines', () => {
			const p = new StreamingParser({ knownTags })
			p.write('{% stat\n  label="Revenue"\n  value="$1M"\n/%}')
			p.flush()
			const nodes = p.getNodes()
			expect(nodes).toHaveLength(1)
			const node = nodes[0] as ComponentNode
			expect(node.name).toBe('stat')
			expect(node.props).toEqual({ label: 'Revenue', value: '$1M' })
		})

		it('parses multiline tag streamed line-by-line', () => {
			const p = new StreamingParser({ knownTags })
			p.write('{% chart\n')
			p.write('  type="bar"\n')
			p.write('  labels=["Q1","Q2"]\n')
			p.write('  values=[100,200]\n')
			p.write('/%}')
			p.flush()
			const nodes = p.getNodes()
			expect(nodes).toHaveLength(1)
			const node = nodes[0] as ComponentNode
			expect(node.name).toBe('chart')
			expect(node.props.type).toBe('bar')
		})

		it('parses multiline body tag with newline after name', () => {
			const p = new StreamingParser({ knownTags })
			p.write('{% callout\n  type="info"\n%}Content{% /callout %}')
			p.flush()
			const nodes = p.getNodes()
			expect(nodes).toHaveLength(1)
			const node = nodes[0] as ComponentNode
			expect(node.name).toBe('callout')
			expect(node.props.type).toBe('info')
		})

		it('parses tag with tab-separated attributes', () => {
			const p = new StreamingParser({ knownTags })
			p.write('{% stat\tlabel="Revenue"\tvalue="$1M" /%}')
			p.flush()
			const nodes = p.getNodes()
			expect(nodes).toHaveLength(1)
			const node = nodes[0] as ComponentNode
			expect(node.name).toBe('stat')
			expect(node.props).toEqual({ label: 'Revenue', value: '$1M' })
		})

		it('parses multiline tag with CRLF line endings', () => {
			const p = new StreamingParser({ knownTags })
			p.write('{% stat\r\n  label="Revenue"\r\n  value="$1M"\r\n/%}')
			p.flush()
			const nodes = p.getNodes()
			expect(nodes).toHaveLength(1)
			const node = nodes[0] as ComponentNode
			expect(node.name).toBe('stat')
			expect(node.props).toEqual({ label: 'Revenue', value: '$1M' })
		})
	})
})
