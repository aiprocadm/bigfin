import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOneClickDemoDto {
  /**
   * Отрасль демо: `services`, `trade` или `projects` (FIN-027).
   *
   * Необязательна: кнопка «посмотреть продукт» должна работать и без
   * выбора. Чужое значение не роняет запрос — берётся самый частый случай.
   */
  @IsString()
  @IsOptional()
  @IsIn(['services', 'trade', 'projects'])
  @ApiProperty({
    required: false,
    description: 'Industry of the demo dataset.',
    example: 'trade',
  })
  industry?: string;
}

export class OneClickDemoSigninDto {
  @IsString()
  @Length(16, 128)
  @ApiProperty({
    description: 'The demo id returned by the one-click demo creation.',
    example: 'a3f1c0…',
  })
  demoId: string;
}

export class OneClickDemoResponseDto {
  @ApiProperty({ description: 'The created demo id (sign-in key).' })
  demoId: string;

  @ApiProperty({ description: 'The generated demo account email.' })
  email: string;

  @ApiProperty({
    description: 'The organization build job of the demo tenant.',
    example: { jobId: '42' },
  })
  buildJob: { jobId: string };
}

export class OneClickDemoBuildJobResponseDto {
  @ApiProperty({ description: 'Build job id.' })
  id: string;

  @ApiProperty({ description: 'Build job state.' })
  state: string;

  @ApiProperty({ description: 'Whether the build job is completed.' })
  isCompleted: boolean;

  @ApiProperty({ description: 'Whether the build job is running.' })
  isRunning: boolean;

  @ApiProperty({ description: 'Whether the build job is waiting.' })
  isWaiting: boolean;

  @ApiProperty({ description: 'Whether the build job has failed.' })
  isFailed: boolean;
}
