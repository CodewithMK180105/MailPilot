import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { EncryptionService } from '../common/encryption.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, EncryptionService],
  exports: [UsersService],
})
export class UsersModule {}
