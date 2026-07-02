import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CampaignOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user: { id: string };
      params: { id?: string };
      campaign?: unknown;
    }>();

    const campaignId = request.params['id'];
    const userId = request.user?.id;

    if (!campaignId || !userId) {
      throw new ForbiddenException('Access denied');
    }

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    if (campaign.userId !== userId) {
      throw new ForbiddenException('You do not have access to this campaign');
    }

    // Attach campaign to request for reuse in controller
    (request as Record<string, unknown>)['campaign'] = campaign;

    return true;
  }
}
