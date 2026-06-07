import { Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { PostHog } from 'posthog-node';
import { EventTrackerService } from './EventTracker.service';
import { ConfigService } from '@nestjs/config';
import { POSTHOG_PROVIDER } from './PostHog.constants';
import { TenancyContext } from '../Tenancy/TenancyContext.service';

@Module({
  providers: [
    EventTrackerService,
    TenancyContext,
    {
      provide: POSTHOG_PROVIDER,
      useFactory: (configService: ConfigService) => {
        if (configService.get('posthog.apiKey')) {
          return new PostHog(configService.get('posthog.apiKey'), {
            host: configService.get('posthog.host'),
          });
        }
        return null;
      },
      inject: [ConfigService],
    },
  ],
  exports: [EventTrackerService, POSTHOG_PROVIDER],
})
export class PostHogModule implements OnApplicationShutdown {
  constructor(
    @Inject(POSTHOG_PROVIDER) private readonly posthog: PostHog | null,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    // Flush any queued events and stop PostHog's background flush timer.
    if (this.posthog) {
      await this.posthog.shutdown();
    }
  }
}
