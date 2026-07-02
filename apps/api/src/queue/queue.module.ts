import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { EmailProducer } from './email.producer';
import { EmailConsumer } from './email.consumer';
import { EMAIL_QUEUE_NAME } from './queue.constants';
import { MailModule } from '../mail/mail.module';
import { TemplateModule } from '../template/template.module';
import { EncryptionService } from '../common/encryption.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('redis.url') ?? 'redis://localhost:6379',
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
    }),
    BullModule.registerQueue({
      name: EMAIL_QUEUE_NAME,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    }),
    MailModule,
    TemplateModule,
  ],
  providers: [EmailProducer, EmailConsumer, EncryptionService],
  exports: [EmailProducer, BullModule],
})
export class QueueModule {}
