import { motion } from 'framer-motion';
import { pageTransition } from '@/lib/animations';

function PageTransition({ children }) {
  return (
    <motion.div
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      exit={pageTransition.exit}
    >
      {children}
    </motion.div>
  );
}

export default PageTransition;
