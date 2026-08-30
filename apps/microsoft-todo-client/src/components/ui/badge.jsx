import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
        counter:
          'border-transparent bg-muted/80 text-muted-foreground font-bold px-2 py-0.5 text-xs',
        themeBlue: 'border-transparent bg-blue-500 text-white',
        themePurple: 'border-transparent bg-purple-500 text-white',
        themeGreen: 'border-transparent bg-emerald-600 text-white',
        themeOrange: 'border-transparent bg-orange-500 text-white',
        themeRed: 'border-transparent bg-red-600 text-white',
        themeDark: 'border-transparent bg-zinc-700 text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
