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

export const executionPlanInputSchema = z.object({
  mission: z.string().min(1, { message: 'Explain the mission you want to accomplish.' }),
  deliverable: z.string().optional(),
  horizon: z.string().optional(),
  constraints: z.array(z.string()).optional().default([])
});

export const browserReconInputSchema = z.object({
  url: z.string().url({ message: 'Provide an absolute URL for reconnaissance.' }),
  question: z.string().min(1, { message: 'Describe what you want to learn from the page.' }),
  selector: z.string().min(1).optional(),
  maxCharacters: z.number().int().positive().optional()
});

export const automationPromptInputSchema = z.object({
  prompt: z.string().min(1, { message: 'Supply a concise automation brief.' }),
  channels: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional()
});

export const shellCommandInputSchema = z.object({
  command: z.string().min(1, { message: 'Specify a command to execute.' }),
  args: z.array(z.string()).optional(),
  cwd: z.string().optional(),
  timeoutMs: z.number().int().positive().max(300000).optional()
});

export const writeArtifactInputSchema = z.object({
  path: z.string().min(1, { message: 'Provide a relative file path.' }),
  content: z.string(),
  description: z.string().optional()
});

export const readArtifactInputSchema = z.object({
  path: z.string().min(1, { message: 'Provide a relative file path to read.' }),
  maxBytes: z.number().int().positive().max(200000).optional()
});

export const listArtifactsInputSchema = z.object({
  path: z.string().optional(),
  recursive: z.boolean().optional(),
  maxEntries: z.number().int().positive().max(200).optional()
});

export type ExecutionPlanInput = z.infer<typeof executionPlanInputSchema>;
export type BrowserReconInput = z.infer<typeof browserReconInputSchema>;
export type AutomationPromptInput = z.infer<typeof automationPromptInputSchema>;
export type ShellCommandInput = z.infer<typeof shellCommandInputSchema>;
export type WriteArtifactInput = z.infer<typeof writeArtifactInputSchema>;
export type ReadArtifactInput = z.infer<typeof readArtifactInputSchema>;
export type ListArtifactsInput = z.infer<typeof listArtifactsInputSchema>;
