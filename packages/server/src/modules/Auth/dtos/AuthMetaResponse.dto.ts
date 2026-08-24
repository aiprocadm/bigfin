import { ApiProperty } from '@nestjs/swagger';

export class AuthMetaResponseDto {
  @ApiProperty({ description: 'Whether signup is disabled' })
  signupDisabled: boolean;

  @ApiProperty({
    description: 'One-click demo availability and its landing url.',
    example: { enable: false, demoUrl: '/demo' },
  })
  oneClickDemo: { enable: boolean; demoUrl: string };
}
