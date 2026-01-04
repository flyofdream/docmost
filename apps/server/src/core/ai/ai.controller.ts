import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { User, Workspace } from '@docmost/db/types/entity.types';

interface AiGenerateDto {
  action?: string;
  content: string;
  prompt?: string;
}

interface AiAskDto {
  query: string;
  spaceId?: string;
  pageId?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly aiService: AiService) {
    this.logger.log('AiController initialized');
  }

  @HttpCode(HttpStatus.OK)
  @Post('generate')
  async generate(@Body() dto: AiGenerateDto) {
    this.logger.log('Generate endpoint called');
    if (!this.aiService.isConfigured()) {
      throw new BadRequestException('AI is not configured');
    }

    let prompt = dto.prompt || dto.content;

    // Handle different actions
    if (dto.action && !dto.prompt) {
      const actionPrompts: Record<string, string> = {
        improve_writing: `Improve the following text while maintaining its meaning and style:\n\n${dto.content}`,
        fix_spelling_grammar: `Fix spelling and grammar errors in the following text:\n\n${dto.content}`,
        make_shorter: `Make the following text more concise while keeping the main points:\n\n${dto.content}`,
        make_longer: `Expand the following text with more details and explanations:\n\n${dto.content}`,
        simplify: `Simplify the following text to make it easier to understand:\n\n${dto.content}`,
        change_tone: `Rewrite the following text in a professional tone:\n\n${dto.content}`,
        summarize: `Summarize the following text:\n\n${dto.content}`,
        continue_writing: `Continue writing from the following text:\n\n${dto.content}`,
        translate: `Translate the following text to English:\n\n${dto.content}`,
      };

      prompt = actionPrompts[dto.action] || dto.content;
    }

    const result = await this.aiService.generateContent(prompt);

    return {
      content: result,
    };
  }

  @Post('generate/stream')
  async generateStream(
    @Body() dto: AiGenerateDto,
    @Res() res: FastifyReply,
  ) {
    this.logger.log('Generate stream endpoint called');
    if (!this.aiService.isConfigured()) {
      throw new BadRequestException('AI is not configured');
    }

    res.header('Content-Type', 'text/event-stream');
    res.header('Cache-Control', 'no-cache');
    res.header('Connection', 'keep-alive');

    let prompt = dto.prompt || dto.content;

    // Handle different actions
    if (dto.action && !dto.prompt) {
      const actionPrompts: Record<string, string> = {
        improve_writing: `Improve the following text while maintaining its meaning and style:\n\n${dto.content}`,
        fix_spelling_grammar: `Fix spelling and grammar errors in the following text:\n\n${dto.content}`,
        make_shorter: `Make the following text more concise while keeping the main points:\n\n${dto.content}`,
        make_longer: `Expand the following text with more details and explanations:\n\n${dto.content}`,
        simplify: `Simplify the following text to make it easier to understand:\n\n${dto.content}`,
        change_tone: `Rewrite the following text in a professional tone:\n\n${dto.content}`,
        summarize: `Summarize the following text:\n\n${dto.content}`,
        continue_writing: `Continue writing from the following text:\n\n${dto.content}`,
        translate: `Translate the following text to English:\n\n${dto.content}`,
      };

      prompt = actionPrompts[dto.action] || dto.content;
    }

    try {
      const stream = this.aiService.generateContentStream(prompt);

      for await (const chunk of stream) {
        res.raw.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      res.raw.write('data: [DONE]\n\n');
      res.raw.end();
    } catch (error) {
      let errorMessage = 'An error occurred';
      let statusCode = 500;

      if (error instanceof Error) {
        errorMessage = error.message;
        // Check for specific error types
        if (error.message.includes('Insufficient Balance') || error.message.includes('402')) {
          errorMessage = '账户余额不足，请充值后重试';
          statusCode = 402;
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'API 密钥无效，请检查配置';
          statusCode = 401;
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
          errorMessage = 'API 端点不存在，请检查配置';
          statusCode = 404;
        } else if (error.message.includes('429') || error.message.includes('Rate limit')) {
          errorMessage = '请求过于频繁，请稍后重试';
          statusCode = 429;
        }
      } else if (typeof error === 'object' && error !== null) {
        const err = error as any;
        if (err.data?.error?.message) {
          errorMessage = err.data.error.message;
          if (errorMessage.includes('Insufficient Balance')) {
            errorMessage = '账户余额不足，请充值后重试';
            statusCode = 402;
          }
        } else if (err.statusCode) {
          statusCode = err.statusCode;
        }
      }

      res.raw.write(
        `data: ${JSON.stringify({ error: errorMessage, statusCode })}\n\n`,
      );
      res.raw.end();
    }
  }

  @Post('ask')
  async ask(@Body() dto: AiAskDto, @Res() res: FastifyReply) {
    this.logger.log('Ask endpoint called with query: ' + dto.query);
    if (!this.aiService.isConfigured()) {
      throw new BadRequestException('AI is not configured');
    }

    res.header('Content-Type', 'text/event-stream');
    res.header('Cache-Control', 'no-cache');
    res.header('Connection', 'keep-alive');

    // For now, just return a simple answer
    // TODO: Implement RAG (Retrieval Augmented Generation) with embeddings
    const systemPrompt =
      'You are a helpful assistant. Answer questions based on the provided context.';
    const prompt = dto.query;

    try {
      const stream = this.aiService.generateContentStream(prompt, systemPrompt);

      for await (const chunk of stream) {
        res.raw.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      res.raw.write('data: [DONE]\n\n');
      res.raw.end();
    } catch (error) {
      let errorMessage = 'An error occurred';
      let statusCode = 500;

      if (error instanceof Error) {
        errorMessage = error.message;
        // Check for specific error types
        if (error.message.includes('Insufficient Balance') || error.message.includes('402')) {
          errorMessage = '账户余额不足，请充值后重试';
          statusCode = 402;
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'API 密钥无效，请检查配置';
          statusCode = 401;
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
          errorMessage = 'API 端点不存在，请检查配置';
          statusCode = 404;
        } else if (error.message.includes('429') || error.message.includes('Rate limit')) {
          errorMessage = '请求过于频繁，请稍后重试';
          statusCode = 429;
        }
      } else if (typeof error === 'object' && error !== null) {
        const err = error as any;
        if (err.data?.error?.message) {
          errorMessage = err.data.error.message;
          if (errorMessage.includes('Insufficient Balance')) {
            errorMessage = '账户余额不足，请充值后重试';
            statusCode = 402;
          }
        } else if (err.statusCode) {
          statusCode = err.statusCode;
        }
      }

      res.raw.write(
        `data: ${JSON.stringify({ error: errorMessage, statusCode })}\n\n`,
      );
      res.raw.end();
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('config')
  async getConfig() {
    this.logger.log('Config endpoint called');
    return {
      configured: this.aiService.isConfigured(),
      availableActions: [
        'improve_writing',
        'fix_spelling_grammar',
        'make_shorter',
        'make_longer',
        'simplify',
        'change_tone',
        'summarize',
        'continue_writing',
        'translate',
        'custom',
      ],
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('test')
  async test() {
    this.logger.log('Test endpoint called');
    return {
      message: 'AI controller is working',
      timestamp: new Date().toISOString(),
    };
  }
}

