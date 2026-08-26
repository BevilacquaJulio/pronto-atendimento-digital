import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { Papel, Prisma } from '../../generated/prisma/client';
import { ConflitoDeEstado, RecursoNaoEncontrado } from '../common/erros/erros';
import type { CriarUsuarioDto } from './dto/criar-usuario.schema';
import type { EditarUsuarioDto } from './dto/editar-usuario.schema';
import type { ListarUsuariosDto } from './dto/listar-usuarios.schema';
import { UsuarioRepository } from './usuario.repository';

const CUSTO_HASH = 10;

@Injectable()
export class UsuarioService {
  constructor(private readonly repo: UsuarioRepository) {}

  async listar(filtros: ListarUsuariosDto) {
    const { itens, total } = await this.repo.listar(filtros);
    return {
      itens,
      total,
      pagina: filtros.pagina,
      porPagina: filtros.porPagina,
      paginas: Math.ceil(total / filtros.porPagina),
    };
  }

  async criar(dto: CriarUsuarioDto) {
    try {
      return await this.repo.criar(
        dto,
        await bcrypt.hash(dto.senha, CUSTO_HASH),
      );
    } catch (erro) {
      if (
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === 'P2002'
      ) {
        throw new ConflitoDeEstado(
          'Já existe usuário com este e-mail',
          'EMAIL_JA_CADASTRADO',
        );
      }
      throw erro;
    }
  }

  async editar(id: string, administradorId: string, dto: EditarUsuarioDto) {
    if (!(await this.repo.existe(id))) {
      throw new RecursoNaoEncontrado('Usuário');
    }
    if (
      id === administradorId &&
      (dto.ativo === false || (dto.papel && dto.papel !== Papel.ADMIN))
    ) {
      throw new ConflitoDeEstado(
        'O administrador não pode remover o próprio acesso',
        'AUTO_BLOQUEIO_ADMIN',
      );
    }
    const senhaHash = dto.senha
      ? await bcrypt.hash(dto.senha, CUSTO_HASH)
      : undefined;
    return this.repo.editar(id, dto, senhaHash);
  }
}
