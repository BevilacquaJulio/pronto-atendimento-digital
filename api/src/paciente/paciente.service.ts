import { Injectable } from '@nestjs/common';
import { Papel } from '../../generated/prisma/client';
import type { UsuarioAutenticado } from '../common/auth/tipos';
import { RecursoNaoEncontrado } from '../common/erros/erros';
import type { ListarPacientesDto } from './dto/listar-pacientes.schema';
import { PacienteRepository } from './paciente.repository';

@Injectable()
export class PacienteService {
  constructor(private readonly repo: PacienteRepository) {}

  async listar(filtros: ListarPacientesDto, usuario: UsuarioAutenticado) {
    const { itens, total } = await this.repo.listar(filtros, usuario);
    return {
      itens,
      total,
      pagina: filtros.pagina,
      porPagina: filtros.porPagina,
      paginas: Math.ceil(total / filtros.porPagina),
    };
  }

  async detalhar(id: string, usuario: UsuarioAutenticado) {
    // Enfermeiro recebe sinais vitais e fluxo assistencial, mas nunca o bloco
    // de prontuário. O médico recebe o histórico completo para continuidade.
    const paciente =
      usuario.papel === Papel.MEDICO
        ? await this.repo.detalharParaMedico(id)
        : await this.repo.detalharParaEnfermeiro(id);
    if (!paciente) {
      throw new RecursoNaoEncontrado('Paciente');
    }
    return paciente;
  }
}
