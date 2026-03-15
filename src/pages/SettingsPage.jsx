import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion } from 'framer-motion';
import { db, storage, auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Label from '@/components/ui/Label';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { toast } from 'sonner';
import { Save, Upload, X, User, Link as LinkIcon, Shield } from 'lucide-react';
import { SKILLS, MAX_BIO_LENGTH } from '@/lib/constants';
import { staggerContainer, staggerItem } from '@/lib/animations';

function SettingsPage() {
  const { user, userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState(userProfile?.skills || []);
  const [skillSearch, setSkillSearch] = useState('');
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);

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

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, { photoURL: url });

      // Update Firestore profile
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
      // Update Firebase Auth displayName
      if (data.displayName !== user.displayName) {
        await updateProfile(auth.currentUser, { displayName: data.displayName });
      }

      // Update Firestore
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
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
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
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <p className="text-xs text-gray-400 mt-2">JPG, PNG or GIF. Max 2MB.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Profile Form */}
        <motion.div variants={staggerItem}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" /> Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Display Name */}
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

                {/* Email (read-only) */}
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email || ''} disabled className="opacity-60" />
                  <p className="text-xs text-gray-400">Email cannot be changed here.</p>
                </div>

                {/* Bio */}
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

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="City, Country"
                    {...register('location')}
                  />
                </div>

                {/* Skills */}
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

                {/* Social Links */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" /> Social Links
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://yourwebsite.com"
                      {...register('website')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="github">GitHub Username</Label>
                    <Input
                      id="github"
                      placeholder="username"
                      {...register('github')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn Username</Label>
                    <Input
                      id="linkedin"
                      placeholder="username"
                      {...register('linkedin')}
                    />
                  </div>
                </div>

                {/* Save */}
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
    </div>
  );
}

export default SettingsPage;
