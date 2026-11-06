import { z } from 'zod'

export const parseRequestSchema = z.object({ content: z.string() })

export const replayRequestSchema = z.object({
	content: z.string().max(16_384, 'Replay supports at most 16384 characters; shorten input.'),
	chunkSize: z.number().int().min(1).max(256).default(4),
	through: z.number().int().nonnegative().default(0),
})
