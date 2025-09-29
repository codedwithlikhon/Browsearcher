import { z } from 'zod';

export const navigateInputSchema = z.object({
  url: z.string().url({ message: 'Provide a fully qualified URL.' })
});

export const extractTextInputSchema = z.object({
  selector: z.string().min(1).optional(),
  maxCharacters: z.number().int().positive().optional()
});

export const domSnapshotInputSchema = z.object({
  timeoutMs: z.number().int().positive().max(60000).optional()
});

export type NavigateInput = z.infer<typeof navigateInputSchema>;
export type ExtractTextInput = z.infer<typeof extractTextInputSchema>;
export type DomSnapshotInput = z.infer<typeof domSnapshotInputSchema>;
