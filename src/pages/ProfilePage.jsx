import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  doc, getDoc, collection, query, where, orderBy, getDocs, limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import IdeaCard from '@/features/ideas/IdeaCard';
import EmptyState from '@/components/common/EmptyState';
import FollowButton from '@/features/follows/FollowButton';
import FollowersList from '@/features/follows/FollowersList';
import {
  MapPin, Globe, Github, Linkedin, Calendar, Lightbulb, Users,
  Star, Settings, ExternalLink, MessageCircle,
} from 'lucide-react';
import { formatDate, formatCount, cn } from '@/lib/utils';
import { motion, useSpring, useTransform, useInView } from 'framer-motion';
import { staggerContainer, staggerItem, fadeInUp, scaleIn, scrollReveal } from '@/lib/animations';

// Animated counter for profile stats
function AnimatedStat({ value }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const spring = useSpring(0, { duration: 1000, bounce: 0 });
  const display = useTransform(spring, (v) => Math.round(v));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) spring.set(value);
  }, [isInView, value, spring]);

  useEffect(() => {
    const unsub = display.on('change', (v) => setDisplayValue(v));
    return unsub;
  }, [display]);

  return <span ref={ref}>{formatCount(displayValue)}</span>;
}

function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ideas, setIdeas] = useState([]);
  const [ideasLoading, setIdeasLoading] = useState(true);
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ideas');

  const isOwnProfile = user && user.uid === id;

  useEffect(() => {
    fetchProfile();
    fetchIdeas();
  }, [id]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'users', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile({ id: docSnap.id, ...docSnap.data() });
      } else {
        navigate('/404', { replace: true });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchIdeas = async () => {
    setIdeasLoading(true);
    try {
      const q = query(
        collection(db, 'ideas'),
        where('ownerId', '==', id),
        where('status', '==', 'published'),
        orderBy('createdAt', 'desc'),
        limit(12)
      );
      const snap = await getDocs(q);
      setIdeas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Error fetching user ideas:', error);
    } finally {
      setIdeasLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-start gap-6 mb-8">
          <Skeleton className="h-24 w-24 rounded-full shrink-0" />
          <div className="flex-1 space-y-3 w-full">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      {/* Profile Header */}
      <motion.div {...fadeInUp}>
        <Card className="mb-8 overflow-hidden">
          {/* Gradient banner */}
          <div className="h-24 sm:h-32 bg-gradient-to-r from-primary-500 via-primary-400 to-primary-600 relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_70%)]" />
          </div>
          <CardContent className="p-6 sm:p-8 -mt-12 sm:-mt-14 relative">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.15 }}
              >
                <Avatar
                  src={profile.photoURL}
                  name={profile.displayName}
                  size="2xl"
                  className="ring-4 ring-white dark:ring-gray-900"
                />
              </motion.div>

              <div className="flex-1 min-w-0 pt-2 sm:pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {profile.displayName}
                  </h1>
                  {isOwnProfile ? (
                    <Link to="/settings">
                      <Button variant="outline" size="sm">
                        <Settings className="h-3.5 w-3.5" /> Edit Profile
                      </Button>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2">
                      <FollowButton
                        targetUserId={id}
                        targetUserName={profile.displayName}
                      />
                      <Link to={`/messages?user=${id}`}>
                        <Button variant="outline" size="sm">
                          <MessageCircle className="h-3.5 w-3.5" /> Message
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>

                {profile.bio && (
                  <p className="text-gray-600 dark:text-gray-400 mb-3">{profile.bio}</p>
                )}

                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {profile.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {profile.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Joined {formatDate(profile.createdAt)}
                  </span>
                </div>

                {/* Links */}
                <div className="flex items-center gap-3">
                  {profile.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-primary-600 dark:hover:text-primary-400">
                      <Globe className="h-4 w-4" />
                    </a>
                  )}
                  {profile.github && (
                    <a href={`https://github.com/${profile.github}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-primary-600 dark:hover:text-primary-400">
                      <Github className="h-4 w-4" />
                    </a>
                  )}
                  {profile.linkedin && (
                    <a href={`https://linkedin.com/in/${profile.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-primary-600 dark:hover:text-primary-400">
                      <Linkedin className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Stats */}
              <motion.div
                className="flex sm:flex-col gap-6 sm:gap-4 sm:text-right shrink-0"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                <motion.div variants={staggerItem}>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    <AnimatedStat value={profile.ideasCount || 0} />
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Ideas</p>
                </motion.div>
                <motion.div variants={staggerItem}>
                  <button onClick={() => setFollowersOpen(true)} className="text-left sm:text-right hover:opacity-80 transition-opacity">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      <AnimatedStat value={profile.followersCount || 0} />
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Followers</p>
                  </button>
                </motion.div>
                <motion.div variants={staggerItem}>
                  <button onClick={() => setFollowingOpen(true)} className="text-left sm:text-right hover:opacity-80 transition-opacity">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      <AnimatedStat value={profile.followingCount || 0} />
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Following</p>
                  </button>
                </motion.div>
                <motion.div variants={staggerItem}>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    <AnimatedStat value={profile.reputation || 0} />
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Reputation</p>
                </motion.div>
              </motion.div>
            </div>

            {/* Skills */}
            {profile.skills && profile.skills.length > 0 && (
              <motion.div
                className="mt-6 pt-6 border-t dark:border-gray-800"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Skills</h3>
                <motion.div
                  className="flex flex-wrap gap-2"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  {profile.skills.map((skill) => (
                    <motion.div key={skill} variants={staggerItem}>
                      <Badge variant="default">{skill}</Badge>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Ideas */}
      <motion.div
        {...fadeInUp}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <Tabs defaultValue="ideas" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="ideas" isActive={activeTab === 'ideas'} layoutId="profile-tab">
              <Lightbulb className="h-4 w-4 mr-1.5" /> Ideas ({ideas.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ideas">
            {ideasLoading ? (
              <div className="grid sm:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-48 rounded-xl" />
                ))}
              </div>
            ) : ideas.length > 0 ? (
              <motion.div
                className="grid sm:grid-cols-2 gap-6"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {ideas.map((idea) => (
                  <motion.div key={idea.id} variants={staggerItem}>
                    <IdeaCard idea={idea} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <EmptyState
                icon={Lightbulb}
                title="No ideas yet"
                description={isOwnProfile ? "Share your first idea with the community!" : "This user hasn't published any ideas yet."}
                action={isOwnProfile ? (
                  <Link to="/ideas/new">
                    <Button>Share an Idea</Button>
                  </Link>
                ) : null}
              />
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Followers/Following modals */}
      <FollowersList
        userId={id}
        type="followers"
        open={followersOpen}
        onOpenChange={setFollowersOpen}
      />
      <FollowersList
        userId={id}
        type="following"
        open={followingOpen}
        onOpenChange={setFollowingOpen}
      />
    </div>
  );
}

export default ProfilePage;
