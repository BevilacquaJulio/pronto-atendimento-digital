import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
import { AtendimentoService } from './atendimento.service';
import type { CadastrarPacienteDto } from './dto/cadastrar-paciente.schema';
import { cadastrarPacienteSchema } from './dto/cadastrar-paciente.schema';
import type { CriarAtendimentoDto } from './dto/criar-atendimento.schema';
import { criarAtendimentoSchema } from './dto/criar-atendimento.schema';
import type { CriarTriagemDto } from './dto/criar-triagem.schema';
import { criarTriagemSchema } from './dto/criar-triagem.schema';
// `import type` no DTO: com isolatedModules + emitDecoratorMetadata, tipo em
// assinatura decorada não pode ser importado como valor.
import type { ListarFilaDto } from './dto/listar-fila.schema';
import { listarFilaSchema } from './dto/listar-fila.schema';

@ApiTags('atendimentos')
@ApiBearerAuth()
@Controller('atendimentos')
export class AtendimentoController {
  constructor(private readonly service: AtendimentoService) {}

  // ADMIN fica de fora de propósito: a fila mostra nome, contato e risco —
  // dado clínico identificável. Ver docs/matriz-de-acesso.md, linha 2.
  @Get()
  @Papeis(Papel.ENFERMEIRO, Papel.MEDICO)
  @Auditavel({
    acao: 'ATENDIMENTO_LISTAGEM',
    recurso: 'atendimento',
    param: 'id',
  })
  @ApiOperation({ summary: 'Lista a fila de atendimentos' })
  @ApiResponse({ status: 200, description: 'Fila paginada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Papel sem acesso à fila' })
  listarFila(
    @Query(new ZodValidationPipe(listarFilaSchema)) filtros: ListarFilaDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.listarFila(filtros, usuario);
  }

  @Post()
  @Papeis(Papel.ENFERMEIRO, Papel.MEDICO)
  @Auditavel({
    acao: 'ATENDIMENTO_CRIACAO',
    recurso: 'atendimento',
    param: 'id',
  })
  @ApiOperation({ summary: 'Inclui um paciente na fila de atendimento' })
  @ApiResponse({ status: 201, description: 'Atendimento criado' })
  @ApiResponse({ status: 404, description: 'Paciente não encontrado' })
  criar(
    @Body(new ZodValidationPipe(criarAtendimentoSchema))
    dto: CriarAtendimentoDto,
  ) {
    return this.service.criar(dto);
  }

  @Post('cadastrar-paciente')
  @Papeis(Papel.ENFERMEIRO)
  @Auditavel({
    acao: 'PACIENTE_CADASTRO_COM_FILA',
    recurso: 'atendimento',
    param: 'id',
  })
  @ApiOperation({
    summary: 'Cadastra o paciente e o inclui na fila de atendimento',
  })
  @ApiResponse({ status: 201, description: 'Paciente e atendimento criados' })
  @ApiResponse({ status: 400, description: 'Dados pessoais inválidos' })
  @ApiResponse({ status: 403, description: 'Apenas enfermagem pode cadastrar' })
  @ApiResponse({ status: 409, description: 'CPF já cadastrado' })
  cadastrarPaciente(
    @Body(new ZodValidationPipe(cadastrarPacienteSchema))
    dto: CadastrarPacienteDto,
  ) {
    return this.service.cadastrarPaciente(dto);
  }

  // `permitirSemVinculo` porque o profissional precisa abrir o atendimento da
  // fila antes de assumir — nesse momento ninguém está vinculado ainda.
  // Depois que alguém assume, só o dono enxerga.
  @Get(':id')
  @Papeis(Papel.ENFERMEIRO, Papel.MEDICO)
  @Escopo({ tipo: 'atendimento', param: 'id', permitirSemVinculo: true })
  @Auditavel({
    acao: 'ATENDIMENTO_LEITURA',
    recurso: 'atendimento',
    param: 'id',
  })
  @ApiOperation({ summary: 'Detalha um atendimento' })
  @ApiResponse({ status: 200, description: 'Atendimento' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem vínculo com o atendimento' })
  detalhar(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.detalhar(id);
  }

  // Sem @Escopo de propósito. Assumir é a ação que **cria** o vínculo: exigir
  // vínculo prévio impediria assumir o primeiro atendimento da fila. Quem
  // pode assumir é decidido pelo papel, e o conflito é resolvido no banco.
  @Post(':id/iniciar')
  @Papeis(Papel.ENFERMEIRO, Papel.MEDICO)
  @Auditavel({
    acao: 'ATENDIMENTO_INICIO',
    recurso: 'atendimento',
    param: 'id',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assume um atendimento que está na fila' })
  @ApiResponse({ status: 201, description: 'Atendimento assumido' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Papel sem permissão' })
  @ApiResponse({
    status: 409,
    description:
      'ATENDIMENTO_JA_ASSUMIDO (outro profissional chegou primeiro) ou ' +
      'JA_TEM_ATENDIMENTO_ATIVO (o solicitante já está atendendo)',
  })
  @ApiResponse({
    status: 422,
    description: 'Atendimento finalizado ou cancelado não pode ser assumido',
  })
  iniciar(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    // O profissional vem do token, nunca do corpo: aceitar um profissionalId
    // enviado pelo cliente permitiria assumir um atendimento em nome de outro.
    return this.service.iniciar(id, usuario);
  }

  @Post(':id/finalizar')
  @Papeis(Papel.ENFERMEIRO, Papel.MEDICO)
  @Escopo({ tipo: 'atendimento', param: 'id', permitirSemVinculo: false })
  @Auditavel({
    acao: 'ATENDIMENTO_FINALIZACAO',
    recurso: 'atendimento',
    param: 'id',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finaliza o atendimento e revoga acessos da sala' })
  @ApiResponse({ status: 200, description: 'Atendimento finalizado' })
  @ApiResponse({ status: 403, description: 'Sem vínculo com o atendimento' })
  @ApiResponse({ status: 409, description: 'Conflito de concorrência' })
  @ApiResponse({ status: 422, description: 'Transição de estado inválida' })
  finalizar(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.finalizar(id, usuario);
  }

  // O escopo permite cancelamento sem vínculo somente enquanto o atendimento
  // ainda está na fila. Um atendimento já assumido por outra pessoa é 403.
  @Post(':id/cancelar')
  @Papeis(Papel.ENFERMEIRO, Papel.MEDICO)
  @Escopo({ tipo: 'atendimento', param: 'id', permitirSemVinculo: true })
  @Auditavel({
    acao: 'ATENDIMENTO_CANCELAMENTO',
    recurso: 'atendimento',
    param: 'id',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancela um atendimento ainda na fila' })
  @ApiResponse({ status: 200, description: 'Atendimento cancelado' })
  @ApiResponse({ status: 409, description: 'Outro profissional assumiu antes' })
  @ApiResponse({ status: 422, description: 'Cancelamento fora da fila' })
  cancelar(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancelar(id);
  }

  @Post(':id/encaminhar')
  @Papeis(Papel.ENFERMEIRO)
  @Escopo({ tipo: 'atendimento', param: 'id', permitirSemVinculo: false })
  @Auditavel({
    acao: 'ATENDIMENTO_ENCAMINHAMENTO',
    recurso: 'atendimento',
    param: 'id',
  })
  @ApiOperation({
    summary: 'Abre ficha médica a partir da etapa de enfermagem',
  })
  @ApiResponse({ status: 201, description: 'Novo atendimento médico criado' })
  @ApiResponse({ status: 403, description: 'Sem vínculo ou papel inadequado' })
  @ApiResponse({ status: 409, description: 'Já encaminhado ou estado mudou' })
  @ApiResponse({
    status: 422,
    description:
      'Sem triagem, já é etapa médica, ou o status não admite encaminhamento',
  })
  encaminhar(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.service.encaminhar(id, usuario.id);
  }

  @Post(':id/triagem')
  @Papeis(Papel.ENFERMEIRO, Papel.MEDICO)
  @Escopo({ tipo: 'atendimento', param: 'id', permitirSemVinculo: false })
  @Auditavel({
    acao: 'TRIAGEM_CRIACAO',
    recurso: 'atendimento',
    param: 'id',
  })
  @ApiOperation({ summary: 'Registra sinais vitais e classificação de risco' })
  @ApiResponse({ status: 201, description: 'Triagem registrada' })
  @ApiResponse({ status: 403, description: 'Sem vínculo com o atendimento' })
  @ApiResponse({ status: 409, description: 'Triagem já registrada' })
  @ApiResponse({
    status: 422,
    description: 'Atendimento não está em andamento',
  })
  criarTriagem(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body(new ZodValidationPipe(criarTriagemSchema)) dto: CriarTriagemDto,
  ) {
    return this.service.criarTriagem(id, usuario.id, dto);
  }
}
