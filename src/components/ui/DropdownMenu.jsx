import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/lib/utils';

function DropdownMenu({ children, ...props }) {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenuContext.Provider value={{ open }}>
      <DropdownMenuPrimitive.Root open={open} onOpenChange={setOpen} {...props}>
        {children}
      </DropdownMenuPrimitive.Root>
    </DropdownMenuContext.Provider>
  );
}

// Internal context for open state
import { createContext, useContext } from 'react';
const DropdownMenuContext = createContext({ open: false });

function DropdownMenuTrigger({ children, ...props }) {
  return (
    <DropdownMenuPrimitive.Trigger asChild {...props}>
      {children}
    </DropdownMenuPrimitive.Trigger>
  );
}

function DropdownMenuContent({ className, children, sideOffset = 8, align = 'end', ...props }) {
  const { open } = useContext(DropdownMenuContext);

  return (
    <AnimatePresence>
      {open && (
        <DropdownMenuPrimitive.Portal forceMount>
          <DropdownMenuPrimitive.Content
            sideOffset={sideOffset}
            align={align}
            asChild
            {...props}
          >
            <motion.div
              className={cn(
                'z-50 min-w-[180px] overflow-hidden rounded-xl border bg-white p-1.5 shadow-lg dark:bg-gray-900',
                className
              )}
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      )}
    </AnimatePresence>
  );
}

function DropdownMenuItem({ className, children, ...props }) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        'relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 outline-none transition-colors',
        'hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-gray-100 dark:focus:bg-gray-800',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.Item>
  );
}

function DropdownMenuSeparator({ className, ...props }) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn('my-1 h-px bg-gray-200 dark:bg-gray-800', className)}
      {...props}
    />
  );
}

function DropdownMenuLabel({ className, children, ...props }) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn('px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400', className)}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.Label>
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
};
