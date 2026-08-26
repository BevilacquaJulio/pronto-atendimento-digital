import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../validacao/zod-validation.pipe';
import { AuthService, RespostaDeLogin } from './auth.service';
import { Publico } from './decorators/publico.decorator';
// `import type` no DTO é exigência do isolatedModules + emitDecoratorMetadata:
// o tipo aparece na assinatura decorada e não pode virar import de runtime.
import type { LoginDto } from './dto/login.schema';
import { loginSchema } from './dto/login.schema';

@ApiTags('auth')
@Publico()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  // O guard agora é global: cobre também o link público do paciente. Esta rota
  // reduz o limite geral de 100 para 10 tentativas por minuto contra força bruta.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Autentica e devolve o token de acesso' })
  @ApiResponse({ status: 200, description: 'Autenticado' })
  @ApiResponse({ status: 400, description: 'Corpo inválido' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  @ApiResponse({ status: 429, description: 'Tentativas em excesso' })
  // Pipe no @Body, não em @UsePipes no método: o JwtAuthGuard lê metadata
  // do handler, e um @UsePipes no mesmo método já chegou a esconder o
  // @Publico() — login virava 401 para todo mundo, inclusive no e2e.
  login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
  ): Promise<RespostaDeLogin> {
    return this.auth.login(dto);
  }
}
