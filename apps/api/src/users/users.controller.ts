import { Controller, Get, Patch, Put, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto, UpdateSendgridKeyDto } from './dto/users.dto';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: JwtUser) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: JwtUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Put('sendgrid-key')
  updateSendgridKey(@CurrentUser() user: JwtUser, @Body() dto: UpdateSendgridKeyDto) {
    return this.usersService.updateSendgridKey(user.id, dto);
  }

  @Get('sendgrid-status')
  getSendgridStatus(@CurrentUser() user: JwtUser) {
    return this.usersService.getSendgridStatus(user.id);
  }
}
