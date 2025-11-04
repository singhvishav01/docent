import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  className?: string
  size?: 'sm' | 'default' | 'lg'
}

export function LoadingSpinner({ className, size = 'default' }: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        'border-2 border-current border-t-transparent rounded-full animate-spin',
        {
          'w-4 h-4': size === 'sm',
          'w-6 h-6': size === 'default',
          'w-8 h-8': size === 'lg',
        },
        className
      )}
    />
  )
}
