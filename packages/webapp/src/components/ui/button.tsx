import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-action text-action-fg hover:bg-action-hover',
        secondary: 'bg-surface-elevated text-text-primary border border-border hover:bg-surface',
        ghost: 'text-text-primary hover:bg-surface-elevated',
        link: 'text-action underline-offset-4 hover:underline',
        destructive: 'bg-danger text-white hover:bg-danger/90',
      },
      // Размеры: на мобильном крупнее (под палец, ≥44px), на десктопе компактнее.
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-11 px-4 sm:h-10',
        lg: 'h-12 px-6 text-base',
        icon: 'h-11 w-11 sm:h-10 sm:w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
