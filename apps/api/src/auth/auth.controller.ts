import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, GoogleAuthDto } from './dto/auth.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async googleAuth(@Body() dto: GoogleAuthDto) {
    return this.authService.googleAuth(dto);
  }

  @Get('me')
  async getMe(@CurrentUser() user: JwtUser) {
    return this.authService.getMe(user.id);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout() {
    // Client-side token invalidation for now
    // Phase 2: implement token blacklist with Redis
    return { message: 'Logged out successfully' };
  }
}
