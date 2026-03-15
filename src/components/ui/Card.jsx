import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { hoverLift } from '@/lib/animations';

const Card = forwardRef(({ className, children, hover = false, glow = false, ...props }, ref) => {
  const Comp = hover ? motion.div : 'div';
  const motionProps = hover
    ? { whileHover: hoverLift, transition: { duration: 0.2 } }
    : {};

  return (
    <Comp
      ref={ref}
      className={cn(
        'rounded-xl border bg-white dark:bg-gray-900 shadow-sm transition-shadow',
        hover && 'cursor-pointer hover:shadow-lg',
        glow && 'hover:shadow-primary-500/20 hover:border-primary-300 dark:hover:border-primary-700',
        className
      )}
      {...motionProps}
      {...props}
    >
      {children}
    </Comp>
  );
});

Card.displayName = 'Card';

function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props}>
      {children}
    </div>
  );
}

function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn('text-lg font-semibold leading-none tracking-tight text-gray-900 dark:text-gray-100', className)} {...props}>
      {children}
    </h3>
  );
}

function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn('text-sm text-gray-500 dark:text-gray-400', className)} {...props}>
      {children}
    </p>
  );
}

function CardContent({ className, children, ...props }) {
  return (
    <div className={cn('p-6 pt-0', className)} {...props}>
      {children}
    </div>
  );
}

function CardFooter({ className, children, ...props }) {
  return (
    <div className={cn('flex items-center p-6 pt-0', className)} {...props}>
      {children}
    </div>
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
