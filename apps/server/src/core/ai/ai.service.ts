import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EnvironmentService } from '../../integrations/environment/environment.service';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOllama } from 'ai-sdk-ollama';
import { generateText, streamText, embedMany } from 'ai';
import { CoreMessage } from 'ai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly environmentService: EnvironmentService) {}

  private getLanguageModel() {
    const driver = this.environmentService.getAiDriver();
    const model = this.environmentService.getAiCompletionModel();

    if (!driver || !model) {
      throw new BadRequestException('AI driver or model not configured');
    }

    switch (driver.toLowerCase()) {
      case 'openai': {
        const apiKey = this.environmentService.getOpenAiApiKey();
        let apiUrl = this.environmentService.getOpenAiApiUrl();

        if (!apiKey) {
          throw new BadRequestException('OPENAI_API_KEY is required');
        }

        // For Deepseek, use the full chat completions endpoint
        // The SDK may try to use /v1/responses for non-standard URLs, so we need to be explicit
        if (apiUrl && apiUrl.includes('deepseek.com')) {
          // Ensure baseURL points to the API root (not /v1)
          apiUrl = apiUrl.replace(/\/v1\/?$/, '');
          apiUrl = apiUrl.replace(/\/$/, '');
          // For Deepseek, we need to ensure it uses chat completions, not responses
          // The SDK should detect this, but if not, we may need to handle it differently
        }

        const openai = createOpenAI({
          apiKey,
          baseURL: apiUrl || 'https://api.openai.com',
        });

        // Force use of chat completions API instead of responses API
        // This is required for Deepseek and other OpenAI-compatible APIs
        return openai.chat(model);
      }

      case 'gemini': {
        const apiKey = this.environmentService.getGeminiApiKey();

        if (!apiKey) {
          throw new BadRequestException('GEMINI_API_KEY is required');
        }

        const google = createGoogleGenerativeAI({
          apiKey,
        });

        return google(model);
      }

      case 'ollama': {
        const apiUrl = this.environmentService.getOllamaApiUrl();

        const ollama = createOllama({
          baseURL: apiUrl,
        });

        return ollama(model);
      }

      default:
        throw new BadRequestException(`Unsupported AI driver: ${driver}`);
    }
  }

  private getEmbeddingModel() {
    const driver = this.environmentService.getAiDriver();
    const model = this.environmentService.getAiEmbeddingModel();

    if (!driver || !model) {
      throw new BadRequestException('AI driver or embedding model not configured');
    }

    switch (driver.toLowerCase()) {
      case 'openai': {
        const apiKey = this.environmentService.getOpenAiApiKey();
        let apiUrl = this.environmentService.getOpenAiApiUrl();

        if (!apiKey) {
          throw new BadRequestException('OPENAI_API_KEY is required');
        }

        // For Deepseek, ensure baseURL doesn't end with /v1
        // The SDK will automatically use /v1/embeddings
        if (apiUrl && apiUrl.includes('deepseek.com')) {
          // Remove /v1 suffix if present, SDK will add it correctly
          apiUrl = apiUrl.replace(/\/v1\/?$/, '');
          // Ensure no trailing slash
          apiUrl = apiUrl.replace(/\/$/, '');
        }

        const openai = createOpenAI({
          apiKey,
          baseURL: apiUrl,
        });

        return openai.embedding(model);
      }

      case 'gemini': {
        const apiKey = this.environmentService.getGeminiApiKey();

        if (!apiKey) {
          throw new BadRequestException('GEMINI_API_KEY is required');
        }

        const google = createGoogleGenerativeAI({
          apiKey,
        });

        return google.embedding(model);
      }

      case 'ollama': {
        const apiUrl = this.environmentService.getOllamaApiUrl();

        const ollama = createOllama({
          baseURL: apiUrl,
        });

        return ollama.embedding(model);
      }

      default:
        throw new BadRequestException(`Unsupported AI driver: ${driver}`);
    }
  }

  async generateContent(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const model = this.getLanguageModel();
      const messages: CoreMessage[] = [];

      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }

      messages.push({ role: 'user', content: prompt });

      const result = await generateText({
        model,
        messages,
      });

      return result.text;
    } catch (error) {
      this.logger.error('Error generating AI content', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new BadRequestException(
        `Failed to generate content: ${errorMessage}`,
      );
    }
  }

  async *generateContentStream(
    prompt: string,
    systemPrompt?: string,
  ): AsyncGenerator<string, void, unknown> {
    try {
      const model = this.getLanguageModel();
      const messages: CoreMessage[] = [];

      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }

      messages.push({ role: 'user', content: prompt });

      const result = await streamText({
        model,
        messages,
      });

      for await (const chunk of result.textStream) {
        yield chunk;
      }
    } catch (error) {
      this.logger.error('Error streaming AI content', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new BadRequestException(
        `Failed to stream content: ${errorMessage}`,
      );
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const embeddingModel = this.getEmbeddingModel();

      const { embeddings } = await embedMany({
        model: embeddingModel,
        values: texts,
      });

      return embeddings;
    } catch (error) {
      this.logger.error('Error generating embeddings', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new BadRequestException(
        `Failed to generate embeddings: ${errorMessage}`,
      );
    }
  }

  isConfigured(): boolean {
    const driver = this.environmentService.getAiDriver();
    return !!driver;
  }
}

