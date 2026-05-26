import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

const meta: Meta = {
  title: 'Components/Tooltip',
  tags: ['autodocs'],
};
export default meta;

export const Default: StoryObj = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="secondary">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent>Подсказка</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};
