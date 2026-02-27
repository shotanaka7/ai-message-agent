import type { ClaudeResponse } from '../api/claude-types';
import type { ClassificationResult, ClassificationBatchResult } from '../../types';

export function parseClassificationResponse(
  response: ClaudeResponse,
  expectedMessageIds: string[]
): ClassificationBatchResult {
  const toolUseBlock = response.content.find(
    block => block.type === 'tool_use' && block.name === 'classify_messages'
  );

  if (!toolUseBlock || !toolUseBlock.input) {
    throw new Error('Claude response does not contain a classify_messages tool_use block');
  }

  const input = toolUseBlock.input as { classifications: ClassificationResult[] };

  if (!Array.isArray(input.classifications)) {
    throw new Error('classify_messages tool input does not contain a classifications array');
  }

  const validatedResults: ClassificationResult[] = input.classifications
    .filter(r => expectedMessageIds.includes(r.message_id))
    .map(r => ({
      message_id: r.message_id,
      project_id: r.project_id ?? null,
      suggested_project_name: r.suggested_project_name ?? null,
      confidence: Math.max(0, Math.min(1, Number(r.confidence) || 0)),
      reasoning: String(r.reasoning || ''),
    }));

  const returnedIds = new Set(validatedResults.map(r => r.message_id));
  const missingIds = expectedMessageIds.filter(id => !returnedIds.has(id));
  if (missingIds.length > 0) {
    console.warn(`Classification missing results for ${missingIds.length} messages`);
  }

  return {
    classifications: validatedResults,
    usage: response.usage,
  };
}
