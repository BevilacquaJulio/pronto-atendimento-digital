import type { SalaService } from '../sala/sala.service';
import { AtendimentoRepository } from './atendimento.repository';
import { AtendimentoService } from './atendimento.service';

describe('AtendimentoService', () => {
  const pacienteExistePorCpf = jest.fn();
  const cadastrarPacienteComAtendimento = jest.fn();
  const buscarPorId = jest.fn();
  const repository = {
    pacienteExistePorCpf,
    cadastrarPacienteComAtendimento,
    buscarPorId,
  } as unknown as AtendimentoRepository;
  const service = new AtendimentoService(repository, {} as SalaService);
  const dto = {
    nome: 'Maria da Silva',
    cpf: '12345678901',
    contato: '(11) 99999-9999',
    nascimento: new Date('1990-01-15T00:00:00.000Z'),
  };

  beforeEach(() => {
    pacienteExistePorCpf.mockReset().mockResolvedValue(false);
    cadastrarPacienteComAtendimento
      .mockReset()
      .mockResolvedValue('atendimento-novo');
    buscarPorId.mockReset().mockResolvedValue({
      id: 'atendimento-novo',
      status: 'AGUARDANDO',
    });
  });

  it('cadastra o paciente e o inclui na fila sem iniciar o atendimento', async () => {
    await expect(service.cadastrarPaciente(dto)).resolves.toEqual({
      id: 'atendimento-novo',
      status: 'AGUARDANDO',
    });

    expect(cadastrarPacienteComAtendimento).toHaveBeenCalledWith(dto);
    expect(buscarPorId).toHaveBeenCalledWith('atendimento-novo');
  });

  it('impede cadastro duplicado pelo CPF', async () => {
    pacienteExistePorCpf.mockResolvedValue(true);

    await expect(service.cadastrarPaciente(dto)).rejects.toMatchObject({
      response: { codigo: 'PACIENTE_JA_CADASTRADO' },
      status: 409,
    });
    expect(cadastrarPacienteComAtendimento).not.toHaveBeenCalled();
  });
});
