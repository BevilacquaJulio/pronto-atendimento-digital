import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { PayloadJwt, UsuarioAutenticado } from './tipos';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const segredo = config.get<string>('JWT_SECRET');
    if (!segredo) {
      throw new Error('JWT_SECRET não definida');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: segredo,
    });
  }

  /**
   * Recarrega o usuário do banco a cada requisição em vez de confiar só no
   * conteúdo do token.
   *
   * O custo é uma consulta por chave primária; o ganho é que desativar um
   * usuário passa a ter efeito imediato. Confiando apenas no payload, quem
   * fosse desativado continuaria com acesso até o token expirar — e é
   * exatamente durante esse intervalo que a desativação costuma importar.
   */
  async validate(payload: PayloadJwt): Promise<UsuarioAutenticado> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { id: true, nome: true, email: true, papel: true, ativo: true },
    });

    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException();
    }

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
    };
  }
}
