import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Input = forwardRef(({ className, type = 'text', error, ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm transition-colors',
        'placeholder:text-gray-400 dark:placeholder:text-gray-500',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-primary-500',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'dark:bg-gray-900 dark:text-gray-100',
        error
          ? 'border-red-500 focus-visible:ring-red-500'
          : 'border-gray-300 dark:border-gray-700',
        className
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export default Input;
