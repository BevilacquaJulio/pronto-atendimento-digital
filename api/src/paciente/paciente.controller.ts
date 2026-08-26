import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Papel } from '../../generated/prisma/client';
import { Auditavel } from '../common/auditoria/auditavel.decorator';
import { Escopo } from '../common/auth/decorators/escopo.decorator';
import { Papeis } from '../common/auth/decorators/papeis.decorator';
import { UsuarioAtual } from '../common/auth/decorators/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../common/auth/tipos';
import { ZodValidationPipe } from '../common/validacao/zod-validation.pipe';
import type { ListarPacientesDto } from './dto/listar-pacientes.schema';
import { listarPacientesSchema } from './dto/listar-pacientes.schema';
import { PacienteService } from './paciente.service';

@ApiTags('pacientes')
@ApiBearerAuth()
@Controller('pacientes')
export class PacienteController {
  constructor(private readonly service: PacienteService) {}

  @Get()
  @Papeis(Papel.ENFERMEIRO, Papel.MEDICO)
  @Auditavel({ acao: 'PACIENTE_LISTAGEM', recurso: 'paciente', param: 'id' })
  @ApiOperation({ summary: 'Lista pacientes dentro do escopo assistencial' })
  @ApiResponse({ status: 200, description: 'Pacientes paginados' })
  @ApiResponse({ status: 403, description: 'ADMIN não acessa dados clínicos' })
  listar(
    @Query(new ZodValidationPipe(listarPacientesSchema))
    filtros: ListarPacientesDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.listar(filtros, usuario);
  }

  @Get(':id')
  @Papeis(Papel.ENFERMEIRO, Papel.MEDICO)
  @Escopo({ tipo: 'paciente', param: 'id' })
  @Auditavel({ acao: 'PACIENTE_LEITURA', recurso: 'paciente', param: 'id' })
  @ApiOperation({ summary: 'Detalha histórico clínico autorizado' })
  @ApiResponse({ status: 200, description: 'Paciente e histórico' })
  @ApiResponse({ status: 403, description: 'Sem vínculo assistencial' })
  detalhar(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.detalhar(id, usuario);
  }
}
