import { Injectable } from '@nestjs/common';
import {
  Papel,
  Prisma,
  StatusAtendimento,
} from '../../generated/prisma/client';
import type { UsuarioAutenticado } from '../common/auth/tipos';
import { PrismaService } from '../common/prisma/prisma.service';
import type { ListarPacientesDto } from './dto/listar-pacientes.schema';

@Injectable()
export class PacienteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listar(filtros: ListarPacientesDto, usuario: UsuarioAutenticado) {
    const cpfBusca = filtros.busca?.replace(/\D/g, '');
    const where: Prisma.PacienteWhereInput = {
      AND: [
        filtros.busca
          ? {
              OR: [
                {
                  nome: {
                    contains: filtros.busca,
                  },
                },
                ...(cpfBusca ? [{ cpf: { contains: cpfBusca } }] : []),
              ],
            }
          : {},
        this.escopoDoUsuario(usuario),
      ],
    };
    const [itens, total] = await this.prisma.$transaction([
      this.prisma.paciente.findMany({
        where,
        orderBy: { nome: 'asc' },
        skip: (filtros.pagina - 1) * filtros.porPagina,
        take: filtros.porPagina,
        select: {
          id: true,
          nome: true,
          cpf: true,
          contato: true,
          nascimento: true,
          _count: { select: { atendimentos: true } },
        },
      }),
      this.prisma.paciente.count({ where }),
    ]);
    return { itens, total };
  }

  async detalharParaEnfermeiro(id: string) {
    return this.prisma.paciente.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        cpf: true,
        contato: true,
        nascimento: true,
        atendimentos: {
          orderBy: { entradaFila: 'desc' },
          select: {
            id: true,
            status: true,
            risco: true,
            entradaFila: true,
            iniciadoEm: true,
            finalizadoEm: true,
            canceladoEm: true,
            profissional: { select: { id: true, nome: true, papel: true } },
            triagem: {
              select: {
                queixa: true,
                pa: true,
                fc: true,
                temperatura: true,
                satO2: true,
                criadoEm: true,
              },
            },
          },
        },
      },
    });
  }

  async detalharParaMedico(id: string) {
    return this.prisma.paciente.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        cpf: true,
        contato: true,
        nascimento: true,
        atendimentos: {
          orderBy: { entradaFila: 'desc' },
          select: {
            id: true,
            status: true,
            risco: true,
            entradaFila: true,
            iniciadoEm: true,
            finalizadoEm: true,
            canceladoEm: true,
            profissional: { select: { id: true, nome: true, papel: true } },
            triagem: {
              select: {
                queixa: true,
                pa: true,
                fc: true,
                temperatura: true,
                satO2: true,
                criadoEm: true,
              },
            },
            prontuario: {
              select: {
                id: true,
                anamnese: true,
                conduta: true,
                prescricao: true,
                finalizadoEm: true,
                autor: { select: { id: true, nome: true } },
                adendos: {
                  orderBy: { criadoEm: 'asc' },
                  select: {
                    id: true,
                    texto: true,
                    criadoEm: true,
                    autor: { select: { id: true, nome: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  private escopoDoUsuario(
    usuario: UsuarioAutenticado,
  ): Prisma.PacienteWhereInput {
    return {
      atendimentos: {
        some: {
          OR: [
            { profissionalId: usuario.id },
            {
              status: StatusAtendimento.AGUARDANDO,
              ...(usuario.papel === Papel.ENFERMEIRO
                ? { encaminhadoDeId: null }
                : {}),
            },
          ],
        },
      },
    };
  }
}
