import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/Card';
import { Lightbulb, Users, Rocket, Target, Heart, Globe } from 'lucide-react';
import { fadeInUp, scrollReveal, staggerContainer, staggerItem } from '@/lib/animations';

function AboutPage() {
  const values = [
    { icon: Lightbulb, title: 'Innovation First', description: 'We believe every idea has the potential to change the world. Brainforge gives ideas a place to grow.' },
    { icon: Users, title: 'Collaboration', description: 'The best projects emerge when diverse minds come together. We make it easy to find your team.' },
    { icon: Rocket, title: 'Execution', description: 'Ideas are just the start. We help you move from concept to reality with the right collaborators.' },
    { icon: Globe, title: 'Open Community', description: 'Brainforge is open to everyone — students, professionals, hobbyists, and dreamers.' },
    { icon: Target, title: 'Focus', description: 'Our platform is designed to reduce noise and help you focus on what matters: building.' },
    { icon: Heart, title: 'Passion-Driven', description: 'We are builders ourselves. Brainforge was created because we believe in the power of shared ideas.' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <motion.div
        className="text-center mb-16"
        initial={fadeInUp.initial}
        animate={fadeInUp.animate}
        transition={fadeInUp.transition}
      >
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          About Brainforge
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          Brainforge is a collaborative idea marketplace where innovators publish ideas,
          discover what others are building, and form teams to bring projects to life.
        </p>
      </motion.div>

      {/* Mission */}
      <motion.div
        className="mb-16"
        {...scrollReveal}
      >
        <Card>
          <CardContent className="p-8 sm:p-12 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Our Mission</h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Too many great ideas never see the light of day — not because they lack merit, but because
              the right people never connect. Brainforge exists to bridge that gap. We are building a
              platform where anyone can share an idea, find collaborators with complementary skills, and
              turn concepts into real projects. Think of it as a meeting point for creativity and execution.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Values */}
      <motion.div
        className="mb-16"
        {...scrollReveal}
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">Our Values</h2>
        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
        >
          {values.map((value) => (
            <motion.div key={value.title} variants={staggerItem}>
              <Card hover>
                <CardContent className="p-6">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mb-4">
                    <value.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{value.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{value.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* CTA */}
      <motion.div
        className="text-center"
        {...scrollReveal}
      >
        <p className="text-gray-500 dark:text-gray-400 mb-4">Ready to share your next big idea?</p>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
        >
          Get Started
        </Link>
      </motion.div>
    </div>
  );
}

export default AboutPage;
