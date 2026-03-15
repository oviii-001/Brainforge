import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fadeInUp } from '@/lib/animations';

function EmptyState({
  icon: Icon,
  title = 'Nothing here yet',
  description = '',
  action,
  className,
}) {
  return (
    <motion.div
      initial={fadeInUp.initial}
      animate={fadeInUp.animate}
      transition={fadeInUp.transition}
      className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}
    >
      {Icon && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
          className="flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4"
        >
          <Icon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
        </motion.div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </motion.div>
  );
}

export default EmptyState;
