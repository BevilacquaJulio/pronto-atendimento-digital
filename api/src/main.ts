import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('PAD — Pronto Atendimento Digital')
    .setDescription(
      'Fila assistencial, triagem, prontuário e sala de teleatendimento. ' +
        'Os códigos 401, 403, 409 e 422 fazem parte do contrato: cada um ' +
        'corresponde a uma regra de negócio documentada em docs/invariantes.md.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  const porta = Number(process.env.API_PORT ?? 3000);
  await app.listen(porta, '0.0.0.0');
}

void bootstrap();
