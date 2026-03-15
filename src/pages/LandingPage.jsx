import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useSpring, useTransform } from 'framer-motion';
import { collection, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  staggerContainer, staggerItem, scrollReveal, hoverLift,
} from '@/lib/animations';
import {
  Lightbulb, Users, Rocket, ArrowRight, CheckCircle,
  Monitor, Briefcase, GraduationCap, Heart, Globe,
  Gamepad2, Palette, FlaskConical, TrendingUp, Zap,
} from 'lucide-react';
import { CATEGORIES } from '@/lib/constants';

const iconMap = {
  Monitor, Briefcase, GraduationCap, Heart, Globe,
  Gamepad2, Palette, FlaskConical, TrendingUp, Lightbulb,
};

// Animated counter hook
function AnimatedCounter({ value, duration = 1.5 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const spring = useSpring(0, { duration: duration * 1000 });
  const display = useTransform(spring, (v) => Math.round(v));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, value, spring]);

  useEffect(() => {
    const unsubscribe = display.on('change', (v) => setDisplayValue(v));
    return unsubscribe;
  }, [display]);

  return <span ref={ref}>{displayValue}</span>;
}

function LandingPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ ideas: 0, users: 0, teams: 0 });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [ideasSnap, usersSnap] = await Promise.all([
          getCountFromServer(collection(db, 'ideas')),
          getCountFromServer(collection(db, 'users')),
        ]);
        setStats({
          ideas: ideasSnap.data().count,
          users: usersSnap.data().count,
          teams: Math.max(1, Math.floor(ideasSnap.data().count * 0.4)),
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative px-4 pt-20 pb-24 sm:pt-28 sm:pb-32">
        {/* Background gradient blob */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <motion.div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-br from-primary-400/20 via-purple-400/10 to-transparent rounded-full blur-3xl"
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.6, 0.8, 0.6],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          {/* Dot grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
            style={{
              backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
        </div>

        <motion.div
          className="mx-auto max-w-4xl text-center"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={staggerItem}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 dark:bg-primary-900/20 px-4 py-1.5 text-sm font-medium text-primary-700 dark:text-primary-300 mb-6">
              <Zap className="h-3.5 w-3.5" />
              Where ideas meet execution
            </span>
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6"
            variants={staggerItem}
          >
            Turn your ideas into{' '}
            <span className="gradient-text">reality</span>
            <br />with the right team
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10"
            variants={staggerItem}
          >
            Brainforge is a collaborative marketplace where innovators share startup ideas,
            find co-founders, and build projects together. Share your vision and connect with
            skilled collaborators.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            variants={staggerItem}
          >
            {user ? (
              <>
                <Link to="/ideas/new">
                  <Button size="lg">
                    <Lightbulb className="h-5 w-5" />
                    Post Your Idea
                  </Button>
                </Link>
                <Link to="/explore">
                  <Button variant="outline" size="lg">
                    Explore Ideas
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/register">
                  <Button size="lg">
                    Get Started Free
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/explore">
                  <Button variant="outline" size="lg">
                    Browse Ideas
                  </Button>
                </Link>
              </>
            )}
          </motion.div>

          {/* Animated Stats */}
          <motion.div
            className="flex items-center justify-center gap-8 sm:gap-16 mt-16"
            variants={staggerItem}
          >
            {[
              { label: 'Ideas Shared', value: stats.ideas },
              { label: 'Collaborators', value: stats.users },
              { label: 'Teams Formed', value: stats.teams },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  <AnimatedCounter value={stat.value} />+
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-4 py-20 bg-gray-50 dark:bg-gray-900/50">
        <div className="mx-auto max-w-6xl">
          <motion.div
            className="text-center mb-16"
            {...scrollReveal}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How Brainforge Works
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              From idea to execution in three simple steps
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-50px' }}
          >
            {[
              {
                icon: Lightbulb,
                title: 'Share Your Idea',
                description: 'Post your startup or project idea with details about the problem you want to solve, your vision, and what skills you need.',
                step: '01',
              },
              {
                icon: Users,
                title: 'Find Collaborators',
                description: 'Connect with talented people who share your passion. Review collaboration requests and build your dream team.',
                step: '02',
              },
              {
                icon: Rocket,
                title: 'Build Together',
                description: 'Work with your team to turn the idea into reality. Track progress, discuss strategies, and launch your project.',
                step: '03',
              },
            ].map((item) => (
              <motion.div
                key={item.title}
                variants={staggerItem}
              >
                <Card className="relative overflow-hidden h-full">
                  <CardContent className="p-8">
                    <span className="absolute top-4 right-4 text-6xl font-bold text-gray-100 dark:text-gray-800">
                      {item.step}
                    </span>
                    <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 mb-5">
                      <item.icon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div
            className="text-center mb-16"
            {...scrollReveal}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Explore by Category
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Discover ideas across different domains and industries
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-50px' }}
          >
            {CATEGORIES.map((category) => {
              const Icon = iconMap[category.icon] || Lightbulb;
              return (
                <motion.div
                  key={category.slug}
                  variants={staggerItem}
                  whileHover={hoverLift}
                >
                  <Link to={`/explore?category=${category.slug}`}>
                    <Card hover className="text-center">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary-50 dark:bg-primary-900/20 mx-auto mb-3">
                          <Icon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {category.name}
                        </h3>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20 bg-gray-50 dark:bg-gray-900/50">
        <div className="mx-auto max-w-6xl">
          <motion.div
            className="text-center mb-16"
            {...scrollReveal}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything you need
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Powerful features to help you go from idea to launch
            </p>
          </motion.div>

          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-50px' }}
          >
            {[
              { title: 'Idea Sharing', desc: 'Post detailed ideas with categories, tags, and skill requirements' },
              { title: 'Smart Discovery', desc: 'Find ideas that match your skills and interests' },
              { title: 'Team Building', desc: 'Send collaboration requests and build the perfect team' },
              { title: 'Community Discussion', desc: 'Comment, upvote, and engage with the community' },
              { title: 'Progress Tracking', desc: 'Track idea stages from concept to launch' },
              { title: 'Real-time Updates', desc: 'Get notified when someone interacts with your ideas' },
            ].map((feature) => (
              <motion.div
                key={feature.title}
                className="flex items-start gap-3 p-4"
                variants={staggerItem}
              >
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">{feature.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="px-4 py-20">
          <motion.div
            className="mx-auto max-w-4xl"
            {...scrollReveal}
          >
            <Card className="bg-gradient-to-r from-primary-600 to-purple-600 border-0">
              <CardContent className="p-12 text-center">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  Ready to forge your next big idea?
                </h2>
                <p className="text-lg text-primary-100 max-w-2xl mx-auto mb-8">
                  Join thousands of innovators who are turning their ideas into reality.
                  It's free to get started.
                </p>
                <Link to="/register">
                  <Button size="lg" className="bg-white text-primary-700 hover:bg-gray-100">
                    Create Your Account
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </section>
      )}
    </div>
  );
}

export default LandingPage;
