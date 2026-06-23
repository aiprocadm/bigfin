import { Command } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseCommand } from './BaseCommand';

@Injectable()
@Command({
  name: 'system:seed:latest',
  description: 'Seed the system database with the latest seed data.',
})
export class SystemSeedLatestCommand extends BaseCommand {
  constructor(configService: ConfigService) {
    super(configService);
  }

  async run(): Promise<void> {
    try {
      const sysKnex = this.initSystemKnex();
      const [log] = await sysKnex.seed.run();

      if (!log || log.length === 0) {
        this.success('No seed files to run');
      }

      this.success(`Ran ${log.length} seed file(s)`);
    } catch (error) {
      this.exit(error);
    }
  }
}
