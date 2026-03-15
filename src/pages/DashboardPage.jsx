import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  collection, query, where, orderBy, getDocs, limit,
  doc, updateDoc, setDoc, deleteDoc, serverTimestamp, increment,
  collectionGroup,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { SkeletonCard } from '@/components/ui/Skeleton';
import EmptyState from '@/components/common/EmptyState';
import { formatRelativeTime } from '@/lib/utils';
import { IDEA_STATUSES, COLLAB_STATUSES } from '@/lib/constants';
import { toast } from 'sonner';
import {
  Plus, Lightbulb, Users, ArrowUpCircle, Eye,
  MessageSquare, Clock, ChevronRight, Rocket,
  CheckCircle, XCircle,
} from 'lucide-react';
import { createNotification } from '@/lib/notifications';
import { motion, useSpring, useTransform, useInView } from 'framer-motion';
import { staggerContainer, staggerItem, fadeInUp } from '@/lib/animations';
import { useRef } from 'react';

// Animated counter component for dashboard stats
function AnimatedCounter({ value }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const spring = useSpring(0, { duration: 1200, bounce: 0 });
  const display = useTransform(spring, (v) => Math.round(v));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, value, spring]);

  useEffect(() => {
    const unsub = display.on('change', (v) => setDisplayValue(v));
    return unsub;
  }, [display]);

  return <span ref={ref}>{displayValue}</span>;
}

function DashboardPage() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [myIdeas, setMyIdeas] = useState([]);
  const [collabRequests, setCollabRequests] = useState([]);
  const [myCollaborations, setMyCollaborations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ ideas: 0, collaborations: 0, upvotes: 0, views: 0 });
  const [activeTab, setActiveTab] = useState('my-ideas');

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch user's ideas
      const ideasQuery = query(
        collection(db, 'ideas'),
        where('ownerId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const ideasSnap = await getDocs(ideasQuery);
      const ideas = ideasSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMyIdeas(ideas);

      // Calculate stats
      let totalUpvotes = 0;
      let totalViews = 0;
      ideas.forEach((idea) => {
        totalUpvotes += (idea.upvotes || 0) - (idea.downvotes || 0);
        totalViews += idea.viewsCount || 0;
      });
      setStats({
        ideas: ideas.length,
        collaborations: userProfile?.collaborationsCount || 0,
        upvotes: totalUpvotes,
        views: totalViews,
      });

      // Fetch incoming collaboration requests from each idea's subcollection
      const allRequests = [];
      for (const idea of ideas) {
        const reqQuery = query(
          collection(db, 'ideas', idea.id, 'requests'),
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc')
        );
        const reqSnap = await getDocs(reqQuery);
        reqSnap.docs.forEach((d) => {
          allRequests.push({
            id: d.id,
            ...d.data(),
            ideaId: idea.id,
            ideaTitle: idea.title,
          });
        });
      }
      // Sort by createdAt
      allRequests.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime - aTime;
      });
      setCollabRequests(allRequests);

      // For "My Collaborations", find ideas where user is a team member but not owner
      const teamQuery = query(
        collection(db, 'ideas'),
        where('status', 'in', ['published', 'in_progress']),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const teamSnap = await getDocs(teamQuery);
      const collabs = [];
      for (const ideaDoc of teamSnap.docs) {
        if (ideaDoc.data().ownerId === user.uid) continue;
        const teamMemberRef = doc(db, 'ideas', ideaDoc.id, 'team', user.uid);
        try {
          const { getDoc: getDocFn } = await import('firebase/firestore');
          const memberSnap = await getDocFn(teamMemberRef);
          if (memberSnap.exists()) {
            collabs.push({ id: ideaDoc.id, ...ideaDoc.data() });
          }
        } catch {
          // skip
        }
      }
      setMyCollaborations(collabs);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (request) => {
    try {
      // Update request status
      await updateDoc(doc(db, 'ideas', request.ideaId, 'requests', request.id), {
        status: 'accepted',
      });

      // Add user to team
      await setDoc(doc(db, 'ideas', request.ideaId, 'team', request.userId), {
        userId: request.userId,
        userName: request.userName,
        userPhotoURL: request.userPhotoURL || '',
        role: 'collaborator',
        skills: request.userSkills || [],
        joinedAt: serverTimestamp(),
      });

      // Increment collaborators count on idea
      await updateDoc(doc(db, 'ideas', request.ideaId), {
        collaboratorsCount: increment(1),
      });

      // Remove from local state
      setCollabRequests((prev) => prev.filter((r) => r.id !== request.id));
      toast.success(`${request.userName} has been added to the team!`);

      // Notify the requester that they were accepted
      createNotification(request.userId, 'collaboration', {
        message: `Your collaboration request for "${request.ideaTitle}" has been accepted! You're now part of the team.`,
        link: `/ideas/${request.ideaId}`,
      });
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Failed to accept request.');
    }
  };

  const handleRejectRequest = async (request) => {
    try {
      await updateDoc(doc(db, 'ideas', request.ideaId, 'requests', request.id), {
        status: 'rejected',
      });
      setCollabRequests((prev) => prev.filter((r) => r.id !== request.id));
      toast.success('Request declined.');

      // Notify the requester that their request was declined
      createNotification(request.userId, 'collaboration', {
        message: `Your collaboration request for "${request.ideaTitle}" was not accepted.`,
        link: `/ideas/${request.ideaId}`,
      });
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to decline request.');
    }
  };

  const statCards = [
    { label: 'My Ideas', value: stats.ideas, icon: Lightbulb, color: 'text-primary-600 bg-primary-100 dark:bg-primary-900/30' },
    { label: 'Collaborations', value: stats.collaborations, icon: Users, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
    { label: 'Total Upvotes', value: stats.upvotes, icon: ArrowUpCircle, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
    { label: 'Total Views', value: stats.views, icon: Eye, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
  ];

  const getStatusBadge = (status, statuses) => {
    const s = statuses.find((st) => st.value === status);
    if (!s) return null;
    return <Badge className={s.color}>{s.label}</Badge>;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        {...fadeInUp}
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {userProfile?.displayName?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Here's what's happening with your ideas
          </p>
        </div>
        <Button onClick={() => navigate('/ideas/new')}>
          <Plus className="h-4 w-4" />
          New Idea
        </Button>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {statCards.map((stat) => (
          <motion.div key={stat.label} variants={staggerItem}>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center h-10 w-10 rounded-lg ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      <AnimatedCounter value={stat.value} />
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Tabs */}
      <motion.div {...fadeInUp} transition={{ delay: 0.2, duration: 0.4 }}>
        <Tabs defaultValue="my-ideas" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="my-ideas" isActive={activeTab === 'my-ideas'} layoutId="dashboard-tab">
              <Lightbulb className="h-4 w-4 mr-1.5" />
              My Ideas ({myIdeas.length})
            </TabsTrigger>
            <TabsTrigger value="requests" isActive={activeTab === 'requests'} layoutId="dashboard-tab">
              <MessageSquare className="h-4 w-4 mr-1.5" />
              Requests ({collabRequests.length})
            </TabsTrigger>
            <TabsTrigger value="collaborations" isActive={activeTab === 'collaborations'} layoutId="dashboard-tab">
              <Users className="h-4 w-4 mr-1.5" />
              Collaborations ({myCollaborations.length})
            </TabsTrigger>
          </TabsList>

          {/* My Ideas Tab */}
          <TabsContent value="my-ideas">
            {loading ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
              </div>
            ) : myIdeas.length > 0 ? (
              <motion.div
                className="space-y-3"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {myIdeas.map((idea) => (
                  <motion.div key={idea.id} variants={staggerItem}>
                    <Link to={`/ideas/${idea.id}`}>
                      <Card hover className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                {idea.title}
                              </h3>
                              {getStatusBadge(idea.status, IDEA_STATUSES)}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {idea.summary}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <ArrowUpCircle className="h-3 w-3" /> {(idea.upvotes || 0) - (idea.downvotes || 0)}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" /> {idea.commentsCount || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {formatRelativeTime(idea.createdAt)}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <EmptyState
                icon={Lightbulb}
                title="No ideas yet"
                description="Share your first idea and start building with the community."
                action={
                  <Button onClick={() => navigate('/ideas/new')}>
                    <Plus className="h-4 w-4" />
                    Post Your First Idea
                  </Button>
                }
              />
            )}
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests">
            {loading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>
            ) : collabRequests.length > 0 ? (
              <motion.div
                className="space-y-3"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {collabRequests.map((req) => (
                  <motion.div key={req.id} variants={staggerItem}>
                    <Card className="p-4">
                      <div className="flex items-start gap-4">
                        <Avatar src={req.userPhotoURL} name={req.userName} size="sm" className="shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white">
                            <Link to={`/profile/${req.userId}`} className="text-primary-600 dark:text-primary-400 hover:underline">
                              {req.userName}
                            </Link>
                            {' '}wants to collaborate on{' '}
                            <Link to={`/ideas/${req.ideaId}`} className="text-primary-600 dark:text-primary-400 hover:underline">
                              {req.ideaTitle}
                            </Link>
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{req.message}</p>
                          {req.userSkills && req.userSkills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {req.userSkills.slice(0, 5).map((s) => (
                                <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-gray-400 mt-2">{formatRelativeTime(req.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button size="sm" variant="success" onClick={() => handleAcceptRequest(req)}>
                            <CheckCircle className="h-3.5 w-3.5" /> Accept
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleRejectRequest(req)}>
                            <XCircle className="h-3.5 w-3.5" /> Decline
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <EmptyState
                icon={MessageSquare}
                title="No pending requests"
                description="Collaboration requests from other users will appear here."
              />
            )}
          </TabsContent>

          {/* My Collaborations Tab */}
          <TabsContent value="collaborations">
            {loading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>
            ) : myCollaborations.length > 0 ? (
              <motion.div
                className="space-y-3"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {myCollaborations.map((idea) => (
                  <motion.div key={idea.id} variants={staggerItem}>
                    <Link to={`/ideas/${idea.id}`}>
                      <Card hover className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                {idea.title}
                              </h3>
                              {getStatusBadge(idea.status, IDEA_STATUSES)}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {idea.summary}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                              <span>by {idea.ownerName}</span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" /> {idea.collaboratorsCount || 0} collaborators
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {formatRelativeTime(idea.createdAt)}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <EmptyState
                icon={Rocket}
                title="No collaborations yet"
                description="Explore ideas and request to collaborate with other innovators."
                action={
                  <Link to="/explore">
                    <Button variant="outline">Explore Ideas</Button>
                  </Link>
                }
              />
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

export default DashboardPage;
