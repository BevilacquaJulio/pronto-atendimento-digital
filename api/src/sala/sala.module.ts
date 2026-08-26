import { Module } from '@nestjs/common';
import { LiveKitProvider } from './livekit.provider';
import { SalaController } from './sala.controller';
import { SalaRepository } from './sala.repository';
import { SalaService } from './sala.service';

@Module({
  controllers: [SalaController],
  providers: [SalaRepository, SalaService, LiveKitProvider],
  exports: [SalaService],
})
export class SalaModule {}
