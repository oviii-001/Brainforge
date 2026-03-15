import { useState, useEffect } from 'react';
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
      <Card className="mb-8">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar src={profile.photoURL} name={profile.displayName} size="2xl" />

            <div className="flex-1 min-w-0">
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
            <div className="flex sm:flex-col gap-6 sm:gap-4 sm:text-right shrink-0">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCount(profile.ideasCount || 0)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Ideas</p>
              </div>
              <button onClick={() => setFollowersOpen(true)} className="text-left sm:text-right hover:opacity-80 transition-opacity">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCount(profile.followersCount || 0)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Followers</p>
              </button>
              <button onClick={() => setFollowingOpen(true)} className="text-left sm:text-right hover:opacity-80 transition-opacity">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCount(profile.followingCount || 0)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Following</p>
              </button>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCount(profile.reputation || 0)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Reputation</p>
              </div>
            </div>
          </div>

          {/* Skills */}
          {profile.skills && profile.skills.length > 0 && (
            <div className="mt-6 pt-6 border-t dark:border-gray-800">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <Badge key={skill} variant="default">{skill}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ideas */}
      <Tabs defaultValue="ideas">
        <TabsList>
          <TabsTrigger value="ideas">
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
            <div className="grid sm:grid-cols-2 gap-6">
              {ideas.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} />
              ))}
            </div>
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
