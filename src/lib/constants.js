export const CATEGORIES = [
  { name: 'Technology', slug: 'technology', icon: 'Monitor', description: 'Software, hardware, AI, and tech innovations' },
  { name: 'Business', slug: 'business', icon: 'Briefcase', description: 'Startups, finance, and business models' },
  { name: 'Education', slug: 'education', icon: 'GraduationCap', description: 'Learning, courses, and educational tools' },
  { name: 'Health', slug: 'health', icon: 'Heart', description: 'Healthcare, wellness, and fitness' },
  { name: 'Social Impact', slug: 'social-impact', icon: 'Globe', description: 'Non-profit, sustainability, and community' },
  { name: 'Entertainment', slug: 'entertainment', icon: 'Gamepad2', description: 'Gaming, media, and content creation' },
  { name: 'Design', slug: 'design', icon: 'Palette', description: 'UI/UX, graphic design, and creative tools' },
  { name: 'Science', slug: 'science', icon: 'FlaskConical', description: 'Research, experiments, and scientific tools' },
  { name: 'Finance', slug: 'finance', icon: 'TrendingUp', description: 'Fintech, investing, and financial tools' },
  { name: 'Other', slug: 'other', icon: 'Lightbulb', description: 'Ideas that don\'t fit other categories' },
];

export const SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'Go', 'Rust', 'Ruby',
  'React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Express', 'Django', 'Flask',
  'React Native', 'Flutter', 'Swift', 'Kotlin',
  'PostgreSQL', 'MongoDB', 'Firebase', 'Redis', 'GraphQL',
  'AWS', 'Google Cloud', 'Azure', 'Docker', 'Kubernetes',
  'UI/UX Design', 'Figma', 'Adobe XD', 'Graphic Design', 'Branding',
  'Machine Learning', 'Data Science', 'AI', 'NLP', 'Computer Vision',
  'Blockchain', 'Smart Contracts', 'Web3',
  'Marketing', 'SEO', 'Content Writing', 'Copywriting', 'Social Media',
  'Product Management', 'Project Management', 'Business Development', 'Sales',
  'DevOps', 'CI/CD', 'Testing', 'Security',
];

export const IDEA_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  { value: 'published', label: 'Published', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
];

export const COLLAB_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
];

export const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest' },
  { value: 'trending', label: 'Trending' },
  { value: 'most_upvoted', label: 'Most Upvoted' },
  { value: 'most_discussed', label: 'Most Discussed' },
];

export const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/initials/svg';

export const MAX_IDEA_TITLE_LENGTH = 100;
export const MAX_IDEA_SUMMARY_LENGTH = 300;
export const MAX_IDEA_DESCRIPTION_LENGTH = 5000;
export const MAX_COMMENT_LENGTH = 2000;
export const MAX_BIO_LENGTH = 500;
export const IDEAS_PER_PAGE = 12;
export const FEED_PER_PAGE = 12;
export const MESSAGES_PER_PAGE = 50;
