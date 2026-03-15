import { Link } from 'react-router-dom';
import { Lightbulb, Github, Twitter } from 'lucide-react';

function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    {
      title: 'Platform',
      links: [
        { label: 'Explore Ideas', to: '/explore' },
        { label: 'How It Works', to: '/#how-it-works' },
        { label: 'Categories', to: '/explore' },
      ],
    },
    {
      title: 'Account',
      links: [
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Settings', to: '/settings' },
        { label: 'Bookmarks', to: '/bookmarks' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'About', to: '/about' },
        { label: 'Contact', to: '/contact' },
        { label: 'Privacy Policy', to: '/privacy' },
      ],
    },
  ];

  return (
    <footer className="border-t bg-gray-50 dark:bg-gray-900/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary-600 text-white">
                <Lightbulb className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                Brainforge
              </span>
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
              A collaborative marketplace where innovators share, discuss, and build ideas together.
            </p>
            <div className="flex gap-3 mt-4">
              <a href="#" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {group.title}
              </h4>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {currentYear} Brainforge. All rights reserved.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Built with React + Firebase
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
