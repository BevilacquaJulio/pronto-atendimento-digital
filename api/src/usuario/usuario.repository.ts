import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import type { CriarUsuarioDto } from './dto/criar-usuario.schema';
import type { EditarUsuarioDto } from './dto/editar-usuario.schema';
import type { ListarUsuariosDto } from './dto/listar-usuarios.schema';

@Injectable()
export class UsuarioRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listar(filtros: ListarUsuariosDto) {
    const where: Prisma.UsuarioWhereInput = {
      ...(filtros.busca
        ? {
            OR: [
              {
                nome: {
                  contains: filtros.busca,
                },
              },
              {
                email: {
                  contains: filtros.busca,
                },
              },
            ],
          }
        : {}),
      ...(filtros.papel ? { papel: filtros.papel } : {}),
      ...(filtros.ativo !== undefined ? { ativo: filtros.ativo } : {}),
    };
    const [itens, total] = await this.prisma.$transaction([
      this.prisma.usuario.findMany({
        where,
        orderBy: { nome: 'asc' },
        skip: (filtros.pagina - 1) * filtros.porPagina,
        take: filtros.porPagina,
        select: {
          id: true,
          nome: true,
          email: true,
          papel: true,
          ativo: true,
          criadoEm: true,
        },
      }),
      this.prisma.usuario.count({ where }),
    ]);
    return { itens, total };
  }

  async criar(dto: CriarUsuarioDto, senhaHash: string) {
    return this.prisma.usuario.create({
      data: {
        nome: dto.nome,
        email: dto.email,
        papel: dto.papel,
        senhaHash,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        papel: true,
        ativo: true,
        criadoEm: true,
      },
    });
  }

  async existe(id: string): Promise<boolean> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: { id: true },
    });
    return usuario !== null;
  }

  async editar(id: string, dto: EditarUsuarioDto, senhaHash?: string) {
    return this.prisma.usuario.update({
      where: { id },
      data: {
        nome: dto.nome,
        papel: dto.papel,
        ativo: dto.ativo,
        ...(senhaHash ? { senhaHash } : {}),
      },
      select: {
        id: true,
        nome: true,
        email: true,
        papel: true,
        ativo: true,
        criadoEm: true,
      },
    });
  }
}
