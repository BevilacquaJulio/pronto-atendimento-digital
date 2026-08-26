import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { Papeis } from '../common/auth/decorators/papeis.decorator';
import { UsuarioAtual } from '../common/auth/decorators/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../common/auth/tipos';
import { ZodValidationPipe } from '../common/validacao/zod-validation.pipe';
import type { CriarUsuarioDto } from './dto/criar-usuario.schema';
import { criarUsuarioSchema } from './dto/criar-usuario.schema';
import type { EditarUsuarioDto } from './dto/editar-usuario.schema';
import { editarUsuarioSchema } from './dto/editar-usuario.schema';
import type { ListarUsuariosDto } from './dto/listar-usuarios.schema';
import { listarUsuariosSchema } from './dto/listar-usuarios.schema';
import { UsuarioService } from './usuario.service';

@ApiTags('usuarios')
@ApiBearerAuth()
@Controller('usuarios')
export class UsuarioController {
  constructor(private readonly service: UsuarioService) {}

  @Get()
  @Papeis(Papel.ADMIN)
  @ApiOperation({ summary: 'Lista usuários e permissões' })
  @ApiResponse({ status: 200, description: 'Usuários paginados' })
  @ApiResponse({ status: 403, description: 'Somente ADMIN' })
  listar(
    @Query(new ZodValidationPipe(listarUsuariosSchema))
    filtros: ListarUsuariosDto,
  ) {
    return this.service.listar(filtros);
  }

  @Post()
  @Papeis(Papel.ADMIN)
  @ApiOperation({ summary: 'Cria usuário com senha protegida por hash' })
  criar(@Body(new ZodValidationPipe(criarUsuarioSchema)) dto: CriarUsuarioDto) {
    return this.service.criar(dto);
  }

  @Patch(':id')
  @Papeis(Papel.ADMIN)
  @ApiOperation({ summary: 'Altera papel, estado, nome ou senha do usuário' })
  editar(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() administrador: UsuarioAutenticado,
    @Body(new ZodValidationPipe(editarUsuarioSchema)) dto: EditarUsuarioDto,
  ) {
    return this.service.editar(id, administrador.id, dto);
  }
}
