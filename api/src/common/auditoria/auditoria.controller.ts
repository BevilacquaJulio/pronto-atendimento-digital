import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Papel } from '../../../generated/prisma/client';
import { Papeis } from '../auth/decorators/papeis.decorator';
import { ZodValidationPipe } from '../validacao/zod-validation.pipe';
import { AuditoriaService } from './auditoria.service';
import type { ListarAuditoriaDto } from './dto/listar-auditoria.schema';
import { listarAuditoriaSchema } from './dto/listar-auditoria.schema';

@ApiTags('auditoria')
@ApiBearerAuth()
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly service: AuditoriaService) {}

  @Get()
  @Papeis(Papel.ADMIN)
  @ApiOperation({ summary: 'Lista metadados de acesso sem conteúdo clínico' })
  @ApiResponse({ status: 200, description: 'Logs paginados' })
  @ApiResponse({ status: 403, description: 'Somente ADMIN' })
  listar(
    @Query(new ZodValidationPipe(listarAuditoriaSchema))
    filtros: ListarAuditoriaDto,
  ) {
    return this.service.listar(filtros);
  }
}
