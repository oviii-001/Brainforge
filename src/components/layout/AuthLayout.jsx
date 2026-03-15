import { Outlet, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { scaleIn } from '@/lib/animations';

function AuthLayout() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-12 overflow-hidden">
      {/* Gradient blob decorations */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link to="/" className="flex items-center gap-2 mb-8">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary-600 text-white">
            <Lightbulb className="h-6 w-6" />
          </div>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            Brainforge
          </span>
        </Link>
      </motion.div>

      {/* Auth form container */}
      <motion.div
        initial={scaleIn.initial}
        animate={scaleIn.animate}
        transition={{ ...scaleIn.transition, duration: 0.35, delay: 0.1 }}
        className="relative z-10 w-full max-w-md"
      >
        <Outlet />
      </motion.div>

      {/* Footer */}
      <p className="mt-8 text-xs text-gray-400 dark:text-gray-500">
        {new Date().getFullYear()} Brainforge. All rights reserved.
      </p>
    </div>
  );
}

export default AuthLayout;
