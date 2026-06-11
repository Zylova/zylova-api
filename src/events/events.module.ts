import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventsGateway } from './events.gateway';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'super-secret-jwt-key-change-in-production-2026',
    }),
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
