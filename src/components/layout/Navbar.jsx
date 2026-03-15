import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/Tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/DropdownMenu';
import {
  Search,
  Sun,
  Moon,
  Bell,
  Menu,
  X,
  Plus,
  LayoutDashboard,
  Compass,
  Bookmark,
  Settings,
  LogOut,
  Shield,
  Lightbulb,
  Rss,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function Navbar({ variant = 'marketing' }) {
  const isApp = variant === 'app';
  const { user, userProfile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  // Shadow-on-scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Listen for unread message count (only in marketing mode — app mode uses sidebar)
  useEffect(() => {
    if (isApp || !user) {
      setUnreadMessages(0);
      return;
    }

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      let count = 0;
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.lastSenderId && data.lastSenderId !== user.uid && !data.readBy?.[user.uid]) {
          count++;
        }
      });
      setUnreadMessages(count);
    }, () => {});

    return () => unsub();
  }, [user, isApp]);

  // Listen for unread notifications count (only in marketing mode)
  useEffect(() => {
    if (isApp || !user) {
      setUnreadNotifications(0);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'notifications'),
      where('read', '==', false)
    );

    const unsub = onSnapshot(q, (snap) => {
      setUnreadNotifications(snap.size);
    }, () => {});

    return () => unsub();
  }, [user, isApp]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navLinks = [
    { to: '/explore', label: 'Explore', icon: Compass },
    { to: '/feed', label: 'Feed', icon: Rss },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={cn(
      'sticky top-0 z-40 w-full border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg transition-shadow duration-300',
      scrolled && 'shadow-md border-transparent dark:shadow-gray-900/50'
    )}>
      <div className={cn(
        'px-4 sm:px-6 lg:px-8',
        isApp ? 'mx-auto' : 'mx-auto max-w-7xl'
      )}>
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary-600 text-white">
              <Lightbulb className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">
              Brainforge
            </span>
          </Link>

          {/* Search bar - desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search ideas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
            </div>
          </form>

          {/* Nav links - desktop (marketing mode only) */}
          {!isApp && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive(link.to)
                      ? 'text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/20'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800'
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleTheme}
                  className="flex items-center justify-center h-9 w-9 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
                  aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                >
                  {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent>{theme === 'light' ? 'Dark mode' : 'Light mode'}</TooltipContent>
            </Tooltip>

            {user ? (
              <>
                {/* Messages - marketing mode only (app mode has sidebar) */}
                {!isApp && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        to="/messages"
                        className="relative flex items-center justify-center h-9 w-9 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Messages"
                      >
                        <MessageCircle className="h-4 w-4" />
                        {unreadMessages > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-primary-600 text-[10px] font-bold text-white">
                            {unreadMessages > 9 ? '9+' : unreadMessages}
                          </span>
                        )}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>Messages</TooltipContent>
                  </Tooltip>
                )}

                {/* Notifications - marketing mode only */}
                {!isApp && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        to="/notifications"
                        className="relative flex items-center justify-center h-9 w-9 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Notifications"
                      >
                        <Bell className="h-4 w-4" />
                        {unreadNotifications > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white">
                            {unreadNotifications > 9 ? '9+' : unreadNotifications}
                          </span>
                        )}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>Notifications</TooltipContent>
                  </Tooltip>
                )}

                {/* Create idea button - hidden on small screens in app mode (sidebar has it) */}
                <Button
                  size="sm"
                  onClick={() => navigate('/ideas/new')}
                  className={cn('hidden sm:flex', isApp && 'hidden lg:flex')}
                >
                  <Plus className="h-4 w-4" />
                  New Idea
                </Button>

                {/* User dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <button className="flex items-center gap-2 rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <Avatar
                        src={userProfile?.photoURL}
                        name={userProfile?.displayName || user.email}
                        size="sm"
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {userProfile?.displayName || 'User'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                          {user.email}
                        </span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/profile/${user.uid}`)}>
                      <Avatar src={userProfile?.photoURL} name={userProfile?.displayName} size="xs" />
                      My Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/bookmarks')}>
                      <Bookmark className="h-4 w-4" />
                      Bookmarks
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/settings')}>
                      <Settings className="h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    {userProfile?.role === 'admin' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate('/admin')}>
                          <Shield className="h-4 w-4" />
                          Admin Panel
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Sign In
                </Button>
                <Button size="sm" onClick={() => navigate('/register')}>
                  Get Started
                </Button>
              </div>
            )}

            {/* Mobile menu toggle - marketing mode only (app mode uses MobileNav) */}
            {!isApp && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex items-center justify-center h-9 w-9 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors md:hidden"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}

            {/* Mobile search toggle - app mode only (small screens) */}
            {isApp && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex items-center justify-center h-9 w-9 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors md:hidden"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu / search dropdown */}
      {mobileMenuOpen && (
        <div className={cn(
          'border-t bg-white dark:bg-gray-950 animate-slide-down',
          isApp ? 'md:hidden' : 'md:hidden'
        )}>
          <div className="px-4 py-3 space-y-3">
            {/* Mobile search */}
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search ideas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>
            </form>

            {/* Marketing mode: show full mobile nav */}
            {!isApp && (
              <>
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive(link.to)
                        ? 'text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/20'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                    )}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                ))}

                {user ? (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                    <Link
                      to="/messages"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Messages
                      {unreadMessages > 0 && (
                        <span className="ml-auto flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary-600 text-[10px] font-bold text-white">
                          {unreadMessages}
                        </span>
                      )}
                    </Link>
                    <Link
                      to="/notifications"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                      <Bell className="h-4 w-4" />
                      Notifications
                      {unreadNotifications > 0 && (
                        <span className="ml-auto flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-red-500 text-[10px] font-bold text-white">
                          {unreadNotifications}
                        </span>
                      )}
                    </Link>
                    <Button className="w-full" onClick={() => { navigate('/ideas/new'); setMobileMenuOpen(false); }}>
                      <Plus className="h-4 w-4" />
                      New Idea
                    </Button>
                  </>
                ) : (
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1" onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}>
                      Sign In
                    </Button>
                    <Button className="flex-1" onClick={() => { navigate('/register'); setMobileMenuOpen(false); }}>
                      Get Started
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
