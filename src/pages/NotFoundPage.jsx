import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import { Home, Search } from 'lucide-react';

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      {/* Big 404 */}
      <div className="relative mb-8">
        <motion.h1
          className="text-[120px] sm:text-[180px] font-bold text-gray-100 dark:text-gray-800 leading-none select-none"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 100, damping: 15, duration: 0.6 }}
        >
          404
        </motion.h1>
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0, rotate: -15 }}
          animate={{ opacity: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 120, damping: 12 }}
        >
          <Search className="h-16 w-16 sm:h-20 sm:w-20 text-primary-500/50" />
        </motion.div>
      </div>

      <motion.h2
        className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        Page Not Found
      </motion.h2>
      <motion.p
        className="text-gray-500 dark:text-gray-400 max-w-md mb-8"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Let&apos;s get you back on track.
      </motion.p>

      <motion.div
        className="flex items-center gap-3"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <Link to="/">
          <Button>
            <Home className="h-4 w-4" /> Go Home
          </Button>
        </Link>
        <Link to="/explore">
          <Button variant="outline">
            <Search className="h-4 w-4" /> Explore Ideas
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}

export default NotFoundPage;
