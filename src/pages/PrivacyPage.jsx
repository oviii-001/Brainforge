import { motion } from 'framer-motion';
import { fadeInUp, scrollReveal } from '@/lib/animations';

function PrivacyPage() {
  const sections = [
    {
      title: '1. Information We Collect',
      content: (
        <p>
          When you create an account on Brainforge, we collect your name, email address, and optional
          profile information such as a profile picture, bio, and skills. We also collect content you
          create, including ideas, comments, and messages.
        </p>
      ),
    },
    {
      title: '2. How We Use Your Information',
      content: (
        <>
          <p>Your information is used to:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Provide and maintain the Brainforge platform</li>
            <li>Display your profile and published ideas to other users</li>
            <li>Enable collaboration features such as team formation and messaging</li>
            <li>Send notifications about activity related to your ideas and collaborations</li>
            <li>Improve the platform through aggregated analytics</li>
          </ul>
        </>
      ),
    },
    {
      title: '3. Data Storage',
      content: (
        <p>
          Your data is stored securely using Google Firebase services, including Firebase Authentication,
          Cloud Firestore, and Firebase Storage. Data is hosted in Google Cloud data centers with
          industry-standard security measures.
        </p>
      ),
    },
    {
      title: '4. Data Sharing',
      content: (
        <p>
          We do not sell, rent, or share your personal information with third parties for marketing
          purposes. Your public profile and published ideas are visible to other Brainforge users.
          Private messages are only visible to conversation participants.
        </p>
      ),
    },
    {
      title: '5. Cookies and Analytics',
      content: (
        <p>
          We use Firebase Analytics to understand how users interact with the platform. This may
          involve cookies and similar technologies. You can manage cookie preferences through your
          browser settings.
        </p>
      ),
    },
    {
      title: '6. Your Rights',
      content: (
        <>
          <p>You have the right to:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Access your personal data</li>
            <li>Update or correct your profile information</li>
            <li>Delete your account and associated data</li>
            <li>Export your data</li>
          </ul>
          <p className="mt-2">
            To exercise these rights, please contact us through our <a href="/contact" className="text-primary-600 dark:text-primary-400 hover:underline">contact page</a>.
          </p>
        </>
      ),
    },
    {
      title: '7. Changes to This Policy',
      content: (
        <p>
          We may update this privacy policy from time to time. We will notify users of any material
          changes by posting a notice on the platform.
        </p>
      ),
    },
    {
      title: '8. Contact',
      content: (
        <p>
          If you have questions about this privacy policy, please contact us at{' '}
          <a href="mailto:support@brainforge.app" className="text-primary-600 dark:text-primary-400 hover:underline">
            support@brainforge.app
          </a>.
        </p>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={fadeInUp.initial}
        animate={fadeInUp.animate}
        transition={fadeInUp.transition}
      >
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-400 mb-8">Last updated: March 2026</p>
      </motion.div>

      <div className="prose dark:prose-invert max-w-none space-y-8 text-gray-700 dark:text-gray-300">
        {sections.map((section, index) => (
          <motion.section
            key={section.title}
            {...scrollReveal}
            transition={{ ...scrollReveal.transition, delay: index * 0.05 }}
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{section.title}</h2>
            {section.content}
          </motion.section>
        ))}
      </div>
    </div>
  );
}

export default PrivacyPage;
