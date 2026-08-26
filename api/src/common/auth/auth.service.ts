import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { CredenciaisInvalidas } from '../erros/erros';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.schema';
import { PayloadJwt } from './tipos';

export interface RespostaDeLogin {
  token: string;
  usuario: { id: string; nome: string; email: string; papel: string };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<RespostaDeLogin> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        nome: true,
        email: true,
        papel: true,
        senhaHash: true,
        ativo: true,
      },
    });

    // Compara o hash mesmo quando o usuário não existe. Sem isso, "e-mail
    // inexistente" responde em ~1ms e "senha errada" em ~80ms (custo do
    // bcrypt), e essa diferença permite descobrir quais e-mails têm conta
    // só cronometrando as respostas. O hash falso abaixo é de uma senha
    // aleatória e serve só para gastar o mesmo tempo.
    const hash = usuario?.senhaHash ?? HASH_FALSO;
    const senhaConfere = await bcrypt.compare(dto.senha, hash);

    if (!usuario || !usuario.ativo || !senhaConfere) {
      // Uma única mensagem para os três casos: dizer "usuário não encontrado"
      // ou "conta desativada" entrega informação a quem está sondando.
      throw new CredenciaisInvalidas();
    }

    const payload: PayloadJwt = {
      sub: usuario.id,
      email: usuario.email,
      papel: usuario.papel,
    };

    return {
      token: await this.jwt.signAsync(payload),
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papel: usuario.papel,
      },
    };
  }
}

// bcrypt de uma senha aleatória, custo 10. Nunca confere com nada.
const HASH_FALSO =
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
