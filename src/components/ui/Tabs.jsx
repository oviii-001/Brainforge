import * as TabsPrimitive from '@radix-ui/react-tabs';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

function Tabs({ className, children, ...props }) {
  return (
    <TabsPrimitive.Root className={cn('w-full', className)} {...props}>
      {children}
    </TabsPrimitive.Root>
  );
}

function TabsList({ className, children, ...props }) {
  return (
    <TabsPrimitive.List
      className={cn(
        'relative inline-flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800/50',
        className
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.List>
  );
}

function TabsTrigger({ className, children, isActive, layoutId = 'tab-indicator', ...props }) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'relative inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors',
        'text-gray-600 dark:text-gray-400',
        'hover:text-gray-900 dark:hover:text-gray-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        'data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100',
        'disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      {...props}
    >
      {isActive && (
        <motion.div
          layoutId={layoutId}
          className="absolute inset-0 rounded-md bg-white shadow-sm dark:bg-gray-800"
          transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </TabsPrimitive.Trigger>
  );
}

function TabsContent({ className, children, ...props }) {
  return (
    <TabsPrimitive.Content
      className={cn(
        'mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg',
        className
      )}
      {...props}
    >
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </TabsPrimitive.Content>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
