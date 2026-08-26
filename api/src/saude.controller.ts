import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Publico } from './common/auth/decorators/publico.decorator';

@ApiTags('saude')
@Controller('saude')
export class SaudeController {
  // Rota pública porque o healthcheck do Docker chama sem credencial.
  // Não expõe nada além de "estou de pé".
  @Get()
  @Publico()
  @ApiOperation({ summary: 'Verificação de vida da API' })
  verificar(): { status: string; em: string } {
    return { status: 'ok', em: new Date().toISOString() };
  }
}
