import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc,
  where, limit, getCountFromServer,
} from 'firebase/firestore';
import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Modal, ModalContent } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import EmptyState from '@/components/common/EmptyState';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/Select';
import { toast } from 'sonner';
import {
  LayoutDashboard, Users, Lightbulb, Flag, Shield, Trash2,
  Eye, Ban, CheckCircle, AlertTriangle,
} from 'lucide-react';
import { formatRelativeTime, formatCount, cn } from '@/lib/utils';
import { CATEGORIES } from '@/lib/constants';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';

function AdminPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ users: 0, ideas: 0, comments: 0 });
  const [users, setUsers] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      // Fetch counts
      const [usersSnap, ideasSnap] = await Promise.all([
        getCountFromServer(collection(db, 'users')),
        getCountFromServer(collection(db, 'ideas')),
      ]);

      setStats({
        users: usersSnap.data().count,
        ideas: ideasSnap.data().count,
      });

      // Fetch recent users and ideas
      const [usersQ, ideasQ] = await Promise.all([
        getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(20))),
        getDocs(query(collection(db, 'ideas'), orderBy('createdAt', 'desc'), limit(20))),
      ]);

      setUsers(usersQ.docs.map((d) => ({ id: d.id, ...d.data() })));
      setIdeas(ideasQ.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
      toast.success(`User role updated to ${newRole}.`);
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update role.');
    }
  };

  const deleteIdea = async (ideaId) => {
    setDeleteLoading(true);
    try {
      await deleteDoc(doc(db, 'ideas', ideaId));
      setIdeas((prev) => prev.filter((i) => i.id !== ideaId));
      setStats((prev) => ({ ...prev, ideas: prev.ideas - 1 }));
      toast.success('Idea deleted.');
    } catch (error) {
      console.error('Error deleting idea:', error);
      toast.error('Failed to delete idea.');
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <motion.div
        className="mb-8"
        initial={fadeInUp.initial}
        animate={fadeInUp.animate}
        transition={fadeInUp.transition}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <Shield className="h-7 w-7 text-primary-600" /> Admin Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Manage users, content, and platform settings
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        className="grid sm:grid-cols-3 gap-4 mb-8"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={staggerItem}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCount(stats.users)}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={staggerItem}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                  <Lightbulb className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCount(stats.ideas)}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Ideas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={staggerItem}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/30">
                  <LayoutDashboard className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCount(stats.users + stats.ideas)}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Activity</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={fadeInUp.initial}
        animate={fadeInUp.animate}
        transition={{ ...fadeInUp.transition, delay: 0.2 }}
      >
      <Tabs defaultValue="users" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users" isActive={activeTab === 'users'} layoutId="admin-tab">
            <Users className="h-4 w-4 mr-1.5" /> Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="ideas" isActive={activeTab === 'ideas'} layoutId="admin-tab">
            <Lightbulb className="h-4 w-4 mr-1.5" /> Ideas ({ideas.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-800">
                      <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400">User</th>
                      <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400">Email</th>
                      <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400">Role</th>
                      <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400">Joined</th>
                      <th className="text-right p-4 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="p-4">
                          <Link to={`/profile/${u.id}`} className="flex items-center gap-2 hover:text-primary-600">
                            <Avatar src={u.photoURL} name={u.displayName} size="sm" />
                            <span className="font-medium text-gray-900 dark:text-white">{u.displayName}</span>
                          </Link>
                        </td>
                        <td className="p-4 text-gray-500 dark:text-gray-400">{u.email}</td>
                        <td className="p-4">
                          <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                            {u.role || 'user'}
                          </Badge>
                        </td>
                        <td className="p-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {formatRelativeTime(u.createdAt)}
                        </td>
                        <td className="p-4 text-right">
                          {u.id !== user.uid && (
                            <Select value={u.role || 'user'} onValueChange={(val) => updateUserRole(u.id, val)}>
                              <SelectTrigger className="w-[100px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ideas">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-800">
                      <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400">Idea</th>
                      <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400">Owner</th>
                      <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400">Category</th>
                      <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
                      <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400">Created</th>
                      <th className="text-right p-4 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ideas.map((idea) => {
                      const cat = CATEGORIES.find((c) => c.slug === idea.category);
                      return (
                        <tr key={idea.id} className="border-b dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="p-4">
                            <Link to={`/ideas/${idea.id}`} className="font-medium text-gray-900 dark:text-white hover:text-primary-600 line-clamp-1 max-w-[200px]">
                              {idea.title}
                            </Link>
                          </td>
                          <td className="p-4 text-gray-500 dark:text-gray-400">{idea.ownerName}</td>
                          <td className="p-4">
                            {cat && <Badge variant="secondary" className="text-[10px]">{cat.name}</Badge>}
                          </td>
                          <td className="p-4">
                            <Badge variant="secondary" className="text-[10px] capitalize">{idea.status}</Badge>
                          </td>
                          <td className="p-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {formatRelativeTime(idea.createdAt)}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link to={`/ideas/${idea.id}`}>
                                <Button variant="ghost" size="icon-sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(idea)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </motion.div>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <ModalContent title="Delete Idea" description="This action cannot be undone.">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This will permanently remove the idea and all associated data.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" loading={deleteLoading} onClick={() => deleteIdea(deleteTarget?.id)}>
              Delete Permanently
            </Button>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}

export default AdminPage;
