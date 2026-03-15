import * as DialogPrimitive from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

function Modal({ open, onOpenChange, children }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitive.Root>
  );
}

function ModalTrigger({ children, asChild = true, ...props }) {
  return (
    <DialogPrimitive.Trigger asChild={asChild} {...props}>
      {children}
    </DialogPrimitive.Trigger>
  );
}

function ModalContent({ className, children, title, description, open, ...props }) {
  return (
    <AnimatePresence>
      {open !== false && (
        <DialogPrimitive.Portal forceMount>
          <DialogPrimitive.Overlay asChild>
            <motion.div
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          </DialogPrimitive.Overlay>
          <DialogPrimitive.Content asChild {...props}>
            <motion.div
              className={cn(
                'fixed left-1/2 top-1/2 z-50 w-full max-w-lg',
                'rounded-xl border bg-white p-6 shadow-xl dark:bg-gray-900',
                'max-h-[90vh] overflow-y-auto',
                className
              )}
              initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {title && (
                <div className="mb-4">
                  <DialogPrimitive.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {title}
                  </DialogPrimitive.Title>
                  {description && (
                    <DialogPrimitive.Description className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {description}
                    </DialogPrimitive.Description>
                  )}
                </div>
              )}
              {children}
              <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </motion.div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      )}
    </AnimatePresence>
  );
}

export { Modal, ModalTrigger, ModalContent };
