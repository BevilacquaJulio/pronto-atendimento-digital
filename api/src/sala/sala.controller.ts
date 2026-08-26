import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Papel } from '../../generated/prisma/client';
import { Auditavel } from '../common/auditoria/auditavel.decorator';
import { Escopo } from '../common/auth/decorators/escopo.decorator';
import { Papeis } from '../common/auth/decorators/papeis.decorator';
import { Publico } from '../common/auth/decorators/publico.decorator';
import { UsuarioAtual } from '../common/auth/decorators/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../common/auth/tipos';
import { ZodValidationPipe } from '../common/validacao/zod-validation.pipe';
import type { EntrarSalaPacienteDto } from './dto/entrar-sala-paciente.schema';
import {
  entrarSalaPacienteSchema,
  tokenOpacoSchema,
} from './dto/entrar-sala-paciente.schema';
import type { RenovarSalaPacienteDto } from './dto/renovar-sala-paciente.schema';
import { renovarSalaPacienteSchema } from './dto/renovar-sala-paciente.schema';
import { SalaService } from './sala.service';

@ApiTags('sala')
@Controller()
export class SalaController {
  constructor(private readonly service: SalaService) {}

  @Post('atendimentos/:id/sala/token')
  @ApiBearerAuth()
  @Papeis(Papel.ENFERMEIRO, Papel.MEDICO)
  @Escopo({ tipo: 'atendimento', param: 'id', permitirSemVinculo: false })
  @Auditavel({
    acao: 'SALA_TOKEN_PROFISSIONAL',
    recurso: 'atendimento',
    param: 'id',
  })
  @ApiOperation({
    summary: 'Emite credencial curta do profissional no LiveKit',
  })
  @ApiResponse({ status: 201, description: 'Token restrito ao atendimento' })
  @ApiResponse({ status: 403, description: 'Sem papel ou vínculo' })
  @ApiResponse({ status: 422, description: 'Atendimento não está ativo' })
  emitirToken(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.emitirTokenProfissional(id, usuario);
  }

  @Post('atendimentos/:id/sala/renovar')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Papeis(Papel.ENFERMEIRO, Papel.MEDICO)
  @Escopo({ tipo: 'atendimento', param: 'id', permitirSemVinculo: false })
  @Auditavel({
    acao: 'SALA_TOKEN_RENOVACAO',
    recurso: 'atendimento',
    param: 'id',
  })
  @ApiOperation({ summary: 'Revoga a credencial anterior e emite outra' })
  @ApiResponse({ status: 200, description: 'Token renovado' })
  renovar(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.renovarTokenProfissional(id, usuario);
  }

  @Post('atendimentos/:id/sala/link-paciente')
  @ApiBearerAuth()
  @Papeis(Papel.ENFERMEIRO, Papel.MEDICO)
  @Escopo({ tipo: 'atendimento', param: 'id', permitirSemVinculo: false })
  @Auditavel({
    acao: 'SALA_LINK_PACIENTE',
    recurso: 'atendimento',
    param: 'id',
  })
  @ApiOperation({ summary: 'Cria link opaco e de uso único para o paciente' })
  @ApiResponse({ status: 201, description: 'Link temporário criado' })
  criarLink(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.criarLinkPaciente(id, usuario.id);
  }

  @Post('sala/:token/entrar')
  @Publico()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Auditavel({
    acao: 'SALA_ENTRADA_PACIENTE',
    recurso: 'atendimento',
    bodyField: 'atendimentoId',
  })
  @ApiOperation({ summary: 'Troca o link do paciente por acesso ao LiveKit' })
  @ApiResponse({ status: 200, description: 'Token LiveKit de curta duração' })
  @ApiResponse({
    status: 403,
    description: 'Link inválido, usado ou de outro atendimento',
  })
  entrarPaciente(
    @Param('token', new ZodValidationPipe(tokenOpacoSchema)) token: string,
    @Body(new ZodValidationPipe(entrarSalaPacienteSchema))
    dto: EntrarSalaPacienteDto,
  ) {
    return this.service.entrarComoPaciente(token, dto);
  }

  @Post('sala/:atendimentoId/renovar')
  @Publico()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Auditavel({
    acao: 'SALA_TOKEN_RENOVACAO_PACIENTE',
    recurso: 'atendimento',
    param: 'atendimentoId',
  })
  @ApiOperation({
    summary: 'Renova o acesso LiveKit atual do paciente',
  })
  @ApiResponse({ status: 200, description: 'Token LiveKit renovado' })
  @ApiResponse({
    status: 403,
    description: 'Credencial inválida, expirada, revogada ou já renovada',
  })
  renovarPaciente(
    @Param('atendimentoId', ParseUUIDPipe) atendimentoId: string,
    @Body(new ZodValidationPipe(renovarSalaPacienteSchema))
    dto: RenovarSalaPacienteDto,
  ) {
    return this.service.renovarTokenPaciente(atendimentoId, dto.token);
  }
}
