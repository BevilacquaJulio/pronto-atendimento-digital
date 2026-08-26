import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
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
import type { CriarAdendoDto } from './dto/criar-adendo.schema';
import { criarAdendoSchema } from './dto/criar-adendo.schema';
import type { CriarProntuarioDto } from './dto/criar-prontuario.schema';
import { criarProntuarioSchema } from './dto/criar-prontuario.schema';
import type { EditarProntuarioDto } from './dto/editar-prontuario.schema';
import { editarProntuarioSchema } from './dto/editar-prontuario.schema';
import { ProntuarioService } from './prontuario.service';

@ApiTags('prontuarios')
@ApiBearerAuth()
@Controller()
export class ProntuarioController {
  constructor(private readonly service: ProntuarioService) {}

  @Get('atendimentos/:id/prontuario')
  @Papeis(Papel.MEDICO)
  @Escopo({ tipo: 'atendimento', param: 'id', permitirSemVinculo: false })
  @Auditavel({
    acao: 'PRONTUARIO_LEITURA',
    recurso: 'atendimento',
    param: 'id',
  })
  @ApiOperation({ summary: 'Lê o prontuário do atendimento vinculado' })
  @ApiResponse({ status: 200, description: 'Prontuário e adendos' })
  @ApiResponse({ status: 403, description: 'Sem papel ou vínculo' })
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.buscarPorAtendimento(id);
  }

  @Post('atendimentos/:id/prontuario')
  @Papeis(Papel.MEDICO)
  @Escopo({ tipo: 'atendimento', param: 'id', permitirSemVinculo: false })
  @Auditavel({
    acao: 'PRONTUARIO_CRIACAO',
    recurso: 'atendimento',
    param: 'id',
  })
  @ApiOperation({ summary: 'Cria o prontuário do atendimento médico' })
  criar(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body(new ZodValidationPipe(criarProntuarioSchema))
    dto: CriarProntuarioDto,
  ) {
    return this.service.criar(id, usuario.id, dto);
  }

  @Patch('prontuarios/:id')
  @Papeis(Papel.MEDICO)
  @Escopo({ tipo: 'prontuario', param: 'id' })
  @Auditavel({
    acao: 'PRONTUARIO_EDICAO',
    recurso: 'prontuario',
    param: 'id',
  })
  @ApiOperation({ summary: 'Edita o prontuário aberto, somente pelo autor' })
  editar(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body(new ZodValidationPipe(editarProntuarioSchema))
    dto: EditarProntuarioDto,
  ) {
    return this.service.editar(id, usuario.id, dto);
  }

  @Post('prontuarios/:id/adendos')
  @Papeis(Papel.MEDICO)
  @Escopo({ tipo: 'prontuario', param: 'id' })
  @Auditavel({
    acao: 'PRONTUARIO_ADENDO',
    recurso: 'prontuario',
    param: 'id',
  })
  @ApiOperation({ summary: 'Acrescenta correção ao prontuário finalizado' })
  criarAdendo(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body(new ZodValidationPipe(criarAdendoSchema)) dto: CriarAdendoDto,
  ) {
    return this.service.criarAdendo(id, usuario.id, dto);
  }
}
