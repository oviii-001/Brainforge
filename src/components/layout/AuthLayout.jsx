import { Outlet, Link } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';

function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-12">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 mb-8">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary-600 text-white">
          <Lightbulb className="h-6 w-6" />
        </div>
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          Brainforge
        </span>
      </Link>

      {/* Auth form container */}
      <div className="w-full max-w-md">
        <Outlet />
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-gray-400 dark:text-gray-500">
        {new Date().getFullYear()} Brainforge. All rights reserved.
      </p>
    </div>
  );
}

export default AuthLayout;
