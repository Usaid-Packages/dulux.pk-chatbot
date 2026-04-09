import type { HTMLAttributes, JSX } from 'react';

import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';

import { cn } from '#/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-2xl px-[10px] py-[3px] text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-surface-muted text-text-secondary',
        pending: 'bg-status-pending-bg text-status-pending-text',
        approved: 'bg-status-approved-bg text-status-approved-text',
        qaApproved: 'bg-status-qaApproved-bg text-status-qaApproved-text',
        success: 'bg-status-approved-bg text-status-approved-text',
        rejected: 'bg-status-rejected-bg text-status-rejected-text',
        destructive: 'bg-status-rejected-bg text-status-rejected-text',
        forwarded: 'bg-status-forwarded-bg text-status-forwarded-text',
        info: 'bg-status-infoReq-bg text-status-infoReq-text',
        resolved: 'bg-status-resolved-bg text-status-resolved-text',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

/**
 * Badge renders compact semantic status or label chips.
 *
 * @param props - Badge props.
 * @returns Badge element.
 */
export const Badge = ({ className, variant, ...props }: BadgeProps): JSX.Element => {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
};
