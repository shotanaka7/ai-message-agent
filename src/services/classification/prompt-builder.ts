import type { Project, Message } from '../../types';
import type { ClaudeToolDefinition, ClaudeMessage } from '../api/claude-types';

export function buildClassificationTool(projectIds: string[]): ClaudeToolDefinition {
  return {
    name: 'classify_messages',
    description: 'Classify each message into a project based on content analysis. Call this tool with the classification results for ALL messages in the batch.',
    input_schema: {
      type: 'object',
      properties: {
        classifications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              message_id: { type: 'string', description: 'The ID of the message being classified' },
              project_id: {
                type: ['string', 'null'],
                description: 'The ID of the matching project, or null if no project matches',
                enum: [...projectIds, null],
              },
              suggested_project_name: {
                type: ['string', 'null'],
                description: 'When project_id is null, suggest a project name. Null if project_id is set.',
              },
              confidence: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                description: 'Confidence score from 0.0 to 1.0',
              },
              reasoning: {
                type: 'string',
                description: 'Brief explanation for the classification decision (1-2 sentences)',
              },
            },
            required: ['message_id', 'project_id', 'confidence', 'reasoning'],
          },
        },
      },
      required: ['classifications'],
    },
  };
}

export function buildSystemPrompt(): string {
  return `You are a message classification AI assistant.
You classify business chat messages (Chatwork/Slack) into projects or cases.

## Rules
1. Classify each message to the most appropriate project
2. Use the project name, description, keywords, and **classification rules** as reference
3. Classification rules (written by user in natural language) take highest priority for deciding project assignment
4. If no project matches, set project_id to null and suggest a new project name in suggested_project_name
5. Set confidence from 0.0 to 1.0 indicating your certainty
6. Write reasoning in the same language as the message (Japanese for Japanese messages)
7. Set low confidence for greetings or casual non-business messages
8. Return results for ALL messages (do not skip any)`;
}

export function buildUserMessage(projects: Project[], messages: Message[]): ClaudeMessage {
  const projectList = projects.map(p => {
    let keywords: string[] = [];
    try {
      keywords = p.keywords ? JSON.parse(p.keywords) as string[] : [];
    } catch {
      keywords = [];
    }
    const parts = [`- ID: ${p.id} | Name: ${p.name} | Description: ${p.description || 'none'} | Keywords: ${keywords.join(', ') || 'none'}`];
    if (p.classification_prompt) {
      parts.push(`  Rules: ${p.classification_prompt}`);
    }
    return parts.join('\n');
  }).join('\n');

  const messageList = messages.map(m =>
    `---\nID: ${m.id}\nSender: ${m.sender_name}\nDate: ${m.sent_at}\nBody:\n${m.body_plain.slice(0, 500)}`
  ).join('\n');

  return {
    role: 'user',
    content: `## Existing Projects\n${projectList || '(No projects)'}\n\n## Messages to Classify (${messages.length})\n${messageList}`,
  };
}
