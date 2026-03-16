import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { doc, updateDoc, serverTimestamp, deleteDoc, getDoc } from 'firebase/firestore';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion } from 'framer-motion';
import { db, storage, auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Label from '@/components/ui/Label';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { toast } from 'sonner';
import {
  Save, Upload, X, User, Link as LinkIcon, Palette, Bell,
  Lock, Sun, Moon, Monitor, Trash2, KeyRound, LogOut, Eye, EyeOff,
} from 'lucide-react';
import { SKILLS, MAX_BIO_LENGTH } from '@/lib/constants';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'account', label: 'Account', icon: Lock },
];

function SettingsPage() {
  const { user, userProfile, refreshProfile, logout } = useAuth();
  const { theme, mode, setTheme } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState(userProfile?.skills || []);
  const [skillSearch, setSkillSearch] = useState('');
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState({
    comments: true,
    votes: true,
    collaborations: true,
    follows: true,
    messages: true,
  });

  // Account
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: {
      displayName: userProfile?.displayName || '',
      bio: userProfile?.bio || '',
      location: userProfile?.location || '',
      website: userProfile?.website || '',
      github: userProfile?.github || '',
      linkedin: userProfile?.linkedin || '',
    },
  });

  const bioLength = watch('bio')?.length || 0;

  // Load notification preferences from Firestore
  useEffect(() => {
    if (userProfile?.notificationPreferences) {
      setNotifPrefs((prev) => ({ ...prev, ...userProfile.notificationPreferences }));
    }
  }, [userProfile]);

  // Skills
  const filteredSkills = SKILLS.filter(
    (skill) => skill.toLowerCase().includes(skillSearch.toLowerCase()) && !selectedSkills.includes(skill)
  ).slice(0, 8);

  const addSkill = (skill) => {
    if (selectedSkills.length < 15) {
      setSelectedSkills([...selectedSkills, skill]);
      setSkillSearch('');
      setShowSkillDropdown(false);
    }
  };

  const removeSkill = (skill) => setSelectedSkills(selectedSkills.filter((s) => s !== skill));

  // Avatar upload
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be less than 2MB.'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return; }

    setUploading(true);
    try {
      const storageRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateProfile(auth.currentUser, { photoURL: url });
      await updateDoc(doc(db, 'users', user.uid), { photoURL: url, updatedAt: serverTimestamp() });
      setAvatarPreview(url);
      toast.success('Avatar updated!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar.');
    } finally {
      setUploading(false);
    }
  };

  // Save profile
  const onSubmit = async (data) => {
    setSaving(true);
    try {
      if (data.displayName !== user.displayName) {
        await updateProfile(auth.currentUser, { displayName: data.displayName });
      }
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: data.displayName,
        bio: data.bio,
        location: data.location,
        website: data.website,
        github: data.github,
        linkedin: data.linkedin,
        skills: selectedSkills,
        updatedAt: serverTimestamp(),
      });
      await refreshProfile();
      toast.success('Profile updated!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  // Save notification preferences
  const saveNotifPrefs = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        notificationPreferences: notifPrefs,
        updatedAt: serverTimestamp(),
      });
      toast.success('Notification preferences saved!');
    } catch (error) {
      console.error('Error saving notification prefs:', error);
      toast.error('Failed to save preferences.');
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setChangingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, passwordData.currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, passwordData.newPassword);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully!');
    } catch (error) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error('Current password is incorrect.');
      } else {
        toast.error('Failed to change password.');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      toast.error('Please type DELETE to confirm.');
      return;
    }
    setDeletingAccount(true);
    try {
      // Delete Firestore user doc
      await deleteDoc(doc(db, 'users', user.uid));
      // Delete Firebase Auth user
      await deleteUser(auth.currentUser);
      toast.success('Account deleted. Goodbye!');
      navigate('/');
    } catch (error) {
      if (error.code === 'auth/requires-recent-login') {
        toast.error('Please sign out and sign in again before deleting your account.');
      } else {
        toast.error('Failed to delete account.');
      }
    } finally {
      setDeletingAccount(false);
    }
  };

  const isPasswordUser = user?.providerData?.some((p) => p.providerId === 'password');

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun, description: 'Always use light theme' },
    { value: 'dark', label: 'Dark', icon: Moon, description: 'Always use dark theme' },
    { value: 'system', label: 'System', icon: Monitor, description: 'Follow your device settings' },
  ];

  const notifOptions = [
    { key: 'comments', label: 'Comments', description: 'When someone comments on your ideas' },
    { key: 'votes', label: 'Upvotes', description: 'When someone upvotes your ideas' },
    { key: 'collaborations', label: 'Collaboration requests', description: 'When someone wants to collaborate' },
    { key: 'follows', label: 'New followers', description: 'When someone follows you' },
    { key: 'messages', label: 'Messages', description: 'When you receive a new message' },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
      {/* Tab navigation */}
      <motion.div
        className="flex items-center gap-1 p-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'relative flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex-1 justify-center sm:flex-none',
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </motion.div>

      {/* ===== PROFILE TAB ===== */}
      {activeTab === 'profile' && (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          key="profile"
        >
          {/* Avatar Section */}
          <motion.div variants={staggerItem}>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" /> Profile Picture
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <Avatar
                    src={avatarPreview || userProfile?.photoURL || user?.photoURL}
                    name={userProfile?.displayName || user?.displayName}
                    size="xl"
                  />
                  <div>
                    <label htmlFor="avatar-upload">
                      <Button variant="outline" size="sm" asChild disabled={uploading}>
                        <span>
                          <Upload className="h-4 w-4" />
                          {uploading ? 'Uploading...' : 'Change Avatar'}
                        </span>
                      </Button>
                    </label>
                    <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                    <p className="text-xs text-gray-400 mt-2">JPG, PNG or GIF. Max 2MB.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Profile Form */}
          <motion.div variants={staggerItem}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name *</Label>
                    <Input
                      id="displayName"
                      placeholder="Your display name"
                      error={errors.displayName}
                      {...register('displayName', {
                        required: 'Display name is required',
                        minLength: { value: 2, message: 'Must be at least 2 characters' },
                      })}
                    />
                    {errors.displayName && <p className="text-xs text-red-500">{errors.displayName.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={user?.email || ''} disabled className="opacity-60" />
                    <p className="text-xs text-gray-400">Email cannot be changed here.</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="bio">Bio</Label>
                      <span className="text-xs text-gray-400">{bioLength}/{MAX_BIO_LENGTH}</span>
                    </div>
                    <Textarea
                      id="bio"
                      placeholder="Tell others about yourself..."
                      className="min-h-[100px]"
                      maxLength={MAX_BIO_LENGTH}
                      {...register('bio')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" placeholder="City, Country" {...register('location')} />
                  </div>

                  <div className="space-y-2">
                    <Label>Skills <span className="text-gray-400 font-normal">(max 15)</span></Label>
                    {selectedSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {selectedSkills.map((skill) => (
                          <Badge key={skill} variant="default" className="gap-1 pr-1">
                            {skill}
                            <button type="button" onClick={() => removeSkill(skill)}>
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="relative">
                      <Input
                        placeholder="Search skills..."
                        value={skillSearch}
                        onChange={(e) => { setSkillSearch(e.target.value); setShowSkillDropdown(true); }}
                        onFocus={() => setShowSkillDropdown(true)}
                        onBlur={() => setTimeout(() => setShowSkillDropdown(false), 200)}
                      />
                      {showSkillDropdown && filteredSkills.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white dark:bg-gray-900 shadow-lg max-h-48 overflow-y-auto">
                          {filteredSkills.map((skill) => (
                            <button
                              key={skill}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                              onMouseDown={() => addSkill(skill)}
                            >
                              {skill}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" /> Social Links
                    </h3>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input id="website" type="url" placeholder="https://yourwebsite.com" {...register('website')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="github">GitHub Username</Label>
                      <Input id="github" placeholder="username" {...register('github')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="linkedin">LinkedIn Username</Label>
                      <Input id="linkedin" placeholder="username" {...register('linkedin')} />
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button type="submit" loading={saving}>
                      <Save className="h-4 w-4" /> Save Changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* ===== APPEARANCE TAB ===== */}
      {activeTab === 'appearance' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          key="appearance"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="h-5 w-5" /> Theme
              </CardTitle>
              <CardDescription>Choose how Brainforge looks to you</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {themeOptions.map((opt) => (
                  <motion.button
                    key={opt.value}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setTheme(opt.value)}
                    className={cn(
                      'relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all',
                      mode === opt.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20 shadow-sm'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    {/* Theme preview card */}
                    <div className={cn(
                      'w-full h-20 rounded-lg overflow-hidden border flex flex-col',
                      opt.value === 'dark' ? 'bg-gray-900 border-gray-700' :
                      opt.value === 'light' ? 'bg-white border-gray-200' :
                      'bg-gradient-to-r from-white to-gray-900 border-gray-300'
                    )}>
                      <div className={cn(
                        'h-4 w-full flex items-center px-2 gap-1',
                        opt.value === 'dark' ? 'bg-gray-800' :
                        opt.value === 'light' ? 'bg-gray-100' :
                        'bg-gradient-to-r from-gray-100 to-gray-800'
                      )}>
                        <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
                        <div className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                        <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                      </div>
                      <div className="flex-1 p-2 flex flex-col gap-1">
                        <div className={cn('h-1.5 w-3/4 rounded', opt.value === 'dark' ? 'bg-gray-700' : opt.value === 'light' ? 'bg-gray-200' : 'bg-gray-400')} />
                        <div className={cn('h-1.5 w-1/2 rounded', opt.value === 'dark' ? 'bg-gray-700' : opt.value === 'light' ? 'bg-gray-200' : 'bg-gray-400')} />
                      </div>
                    </div>

                    <div className="text-center">
                      <opt.icon className={cn(
                        'h-5 w-5 mx-auto mb-1',
                        mode === opt.value ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
                      )} />
                      <p className={cn(
                        'text-sm font-medium',
                        mode === opt.value ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
                      )}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.description}</p>
                    </div>

                    {mode === opt.value && (
                      <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary-500 flex items-center justify-center">
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ===== NOTIFICATIONS TAB ===== */}
      {activeTab === 'notifications' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          key="notifications"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" /> Notification Preferences
              </CardTitle>
              <CardDescription>Choose which notifications you want to receive</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {notifOptions.map((opt) => (
                  <div
                    key={opt.key}
                    className="flex items-center justify-between py-3 px-1 border-b border-gray-100 dark:border-gray-800 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{opt.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{opt.description}</p>
                    </div>
                    {/* Toggle switch */}
                    <button
                      role="switch"
                      aria-checked={notifPrefs[opt.key]}
                      onClick={() => setNotifPrefs((prev) => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                      className={cn(
                        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                        notifPrefs[opt.key] ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                      )}
                    >
                      <span
                        className={cn(
                          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform ring-0 transition-transform duration-200 ease-in-out',
                          notifPrefs[opt.key] ? 'translate-x-5' : 'translate-x-0'
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
              <div className="pt-4 mt-4 border-t">
                <Button onClick={saveNotifPrefs}>
                  <Save className="h-4 w-4" /> Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ===== ACCOUNT TAB ===== */}
      {activeTab === 'account' && (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          key="account"
          className="space-y-6"
        >
          {/* Change Password (only for email/password users) */}
          {isPasswordUser && (
            <motion.div variants={staggerItem}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <KeyRound className="h-5 w-5" /> Change Password
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? 'text' : 'password'}
                        placeholder="Enter current password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData((p) => ({ ...p, currentPassword: e.target.value }))}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="At least 6 characters"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData((p) => ({ ...p, newPassword: e.target.value }))}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData((p) => ({ ...p, confirmPassword: e.target.value }))}
                    />
                  </div>
                  <Button onClick={handleChangePassword} loading={changingPassword}>
                    <KeyRound className="h-4 w-4" /> Change Password
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Sign Out */}
          <motion.div variants={staggerItem}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <LogOut className="h-5 w-5" /> Sign Out
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Sign out of your account on this device.
                </p>
                <Button
                  variant="outline"
                  onClick={async () => {
                    await logout();
                    navigate('/');
                  }}
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Danger Zone */}
          <motion.div variants={staggerItem}>
            <Card className="border-red-200 dark:border-red-900/50">
              <CardHeader>
                <CardTitle className="text-lg text-red-600 dark:text-red-400 flex items-center gap-2">
                  <Trash2 className="h-5 w-5" /> Delete Account
                </CardTitle>
                <CardDescription className="text-red-500/80">
                  This action is permanent and cannot be undone. All your data will be deleted.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="deleteConfirm" className="text-red-600 dark:text-red-400">
                    Type <span className="font-mono font-bold">DELETE</span> to confirm
                  </Label>
                  <Input
                    id="deleteConfirm"
                    placeholder="DELETE"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    className="max-w-xs border-red-200 dark:border-red-900 focus:border-red-500"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleDeleteAccount}
                  loading={deletingAccount}
                  disabled={deleteConfirm !== 'DELETE'}
                  className="border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-4 w-4" /> Delete My Account
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

export default SettingsPage;
