import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import { Home, ArrowLeft, Search } from 'lucide-react';

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      {/* Big 404 */}
      <div className="relative mb-8">
        <h1 className="text-[120px] sm:text-[180px] font-bold text-gray-100 dark:text-gray-800 leading-none select-none">
          404
        </h1>
        <div className="absolute inset-0 flex items-center justify-center">
          <Search className="h-16 w-16 sm:h-20 sm:w-20 text-primary-500/50" />
        </div>
      </div>

      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
        Page Not Found
      </h2>
      <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
        The page you&apos;re looking for doesn&apos;t exist or has been moved. 
        Let&apos;s get you back on track.
      </p>

      <div className="flex items-center gap-3">
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
      </div>
    </div>
  );
}

export default NotFoundPage;
