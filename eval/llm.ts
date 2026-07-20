import type { CompositionPlan } from './metrics.js';

export interface LLMProvider {
  generateCompositionPlan(
    featureRequest: string,
    ontologyContext: string,
    systemPrompt: string,
  ): Promise<CompositionPlan>;
  generateBaseline(featureRequest: string): Promise<string>;
}

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export class OpenAIProvider implements LLMProvider {
  private config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    this.config = config;
  }

  async generateCompositionPlan(
    featureRequest: string,
    ontologyContext: string,
    systemPrompt: string,
  ): Promise<CompositionPlan> {
    const messages = [
      { role: 'system', content: `${systemPrompt}\n\n${ontologyContext}` },
      {
        role: 'user',
        content: `Feature request: ${featureRequest}\n\nEmit a composition plan as JSON matching the schema.`,
      },
    ];

    const response = await fetch(`${this.config.baseUrl ?? 'https://api.openai.com/v1'}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model ?? 'gpt-4o',
        messages,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const data = (await response.json()) as { choices: { message: { content: string } }[] };
    const plan = JSON.parse(data.choices[0].message.content) as CompositionPlan;
    return plan;
  }

  async generateBaseline(featureRequest: string): Promise<string> {
    const messages = [
      {
        role: 'system',
        content:
          'You are a software engineer. Generate code for the following feature request. Be concise but complete.',
      },
      { role: 'user', content: featureRequest },
    ];

    const response = await fetch(`${this.config.baseUrl ?? 'https://api.openai.com/v1'}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model ?? 'gpt-4o',
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const data = (await response.json()) as { choices: { message: { content: string } }[] };
    return data.choices[0].message.content;
  }
}
