import { describe, expect, it } from 'vitest'
import { StreamingParser } from '../src/parser'
import type { ComponentNode, ProseNode } from '../src/types'

const knownTags = new Set(['button', 'callout', 'chart', 'table'])

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
		expect(node.children).toHaveLength(2)
		expect((node.children[0] as ProseNode).content).toBe('Hello ')
		expect((node.children[1] as ProseNode).content).toBe('world')
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
	})
})
