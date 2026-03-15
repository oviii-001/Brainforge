import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Label from '@/components/ui/Label';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from 'sonner';
import { ArrowLeft, X, Save } from 'lucide-react';
import { CATEGORIES, SKILLS, IDEA_STATUSES, MAX_IDEA_TITLE_LENGTH, MAX_IDEA_SUMMARY_LENGTH, MAX_IDEA_DESCRIPTION_LENGTH } from '@/lib/constants';

function EditIdeaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [skillSearch, setSkillSearch] = useState('');
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm();

  const titleLength = watch('title')?.length || 0;
  const summaryLength = watch('summary')?.length || 0;

  // Fetch idea data
  useEffect(() => {
    fetchIdea();
  }, [id]);

  const fetchIdea = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'ideas', id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        toast.error('Idea not found.');
        navigate('/dashboard');
        return;
      }

      const ideaData = docSnap.data();

      // Check ownership
      if (ideaData.ownerId !== user?.uid) {
        toast.error('You can only edit your own ideas.');
        navigate(`/ideas/${id}`);
        return;
      }

      // Populate form
      reset({
        title: ideaData.title || '',
        summary: ideaData.summary || '',
        description: ideaData.description || '',
        category: ideaData.category || '',
        status: ideaData.status || 'published',
        maxTeamSize: ideaData.maxTeamSize || 5,
      });

      setSelectedTags(ideaData.tags || []);
      setSelectedSkills(ideaData.skillsNeeded || []);
    } catch (error) {
      console.error('Error fetching idea:', error);
      toast.error('Failed to load idea.');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Tag management
  const addTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase();
      if (tag && !selectedTags.includes(tag) && selectedTags.length < 5) {
        setSelectedTags([...selectedTags, tag]);
        setTagInput('');
      }
    }
  };

  const removeTag = (tag) => setSelectedTags(selectedTags.filter((t) => t !== tag));

  // Skill management
  const filteredSkills = SKILLS.filter(
    (skill) => skill.toLowerCase().includes(skillSearch.toLowerCase()) && !selectedSkills.includes(skill)
  ).slice(0, 8);

  const addSkill = (skill) => {
    if (selectedSkills.length < 10) {
      setSelectedSkills([...selectedSkills, skill]);
      setSkillSearch('');
      setShowSkillDropdown(false);
    }
  };

  const removeSkill = (skill) => setSelectedSkills(selectedSkills.filter((s) => s !== skill));

  // Submit
  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const ideaRef = doc(db, 'ideas', id);
      await updateDoc(ideaRef, {
        title: data.title,
        summary: data.summary,
        description: data.description,
        category: data.category,
        tags: selectedTags,
        status: data.status,
        skillsNeeded: selectedSkills,
        maxTeamSize: parseInt(data.maxTeamSize) || 5,
        updatedAt: serverTimestamp(),
      });

      toast.success('Idea updated successfully!');
      navigate(`/ideas/${id}`);
    } catch (error) {
      console.error('Error updating idea:', error);
      toast.error('Failed to update idea.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        <Skeleton className="h-6 w-20 mb-6" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Edit Idea</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Update your idea details below.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="title">Title *</Label>
                <span className="text-xs text-gray-400">{titleLength}/{MAX_IDEA_TITLE_LENGTH}</span>
              </div>
              <Input
                id="title"
                placeholder="A short, compelling title for your idea"
                error={errors.title}
                maxLength={MAX_IDEA_TITLE_LENGTH}
                {...register('title', {
                  required: 'Title is required',
                  minLength: { value: 5, message: 'Title must be at least 5 characters' },
                })}
              />
              {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
            </div>

            {/* Summary */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="summary">Summary *</Label>
                <span className="text-xs text-gray-400">{summaryLength}/{MAX_IDEA_SUMMARY_LENGTH}</span>
              </div>
              <Textarea
                id="summary"
                placeholder="A brief summary of your idea"
                className="min-h-[80px]"
                maxLength={MAX_IDEA_SUMMARY_LENGTH}
                error={errors.summary}
                {...register('summary', {
                  required: 'Summary is required',
                  minLength: { value: 20, message: 'Summary must be at least 20 characters' },
                })}
              />
              {errors.summary && <p className="text-xs text-red-500">{errors.summary.message}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Full Description *</Label>
              <Textarea
                id="description"
                placeholder="Provide a detailed description of your idea..."
                className="min-h-[200px]"
                maxLength={MAX_IDEA_DESCRIPTION_LENGTH}
                error={errors.description}
                {...register('description', {
                  required: 'Description is required',
                  minLength: { value: 50, message: 'Description must be at least 50 characters' },
                })}
              />
              {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <select
                id="category"
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                {...register('category', { required: 'Category is required' })}
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                ))}
              </select>
              {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags <span className="text-gray-400 font-normal">(max 5, press Enter to add)</span></Label>
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                      #{tag}
                      <button type="button" onClick={() => removeTag(tag)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <Input
                placeholder="Add tags (e.g., ai, mobile, saas)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={addTag}
                disabled={selectedTags.length >= 5}
              />
            </div>

            {/* Skills Needed */}
            <div className="space-y-2">
              <Label>Skills Needed <span className="text-gray-400 font-normal">(max 10)</span></Label>
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

            {/* Max Team Size */}
            <div className="space-y-2">
              <Label htmlFor="maxTeamSize">Max Team Size</Label>
              <Input
                id="maxTeamSize"
                type="number"
                min="2"
                max="20"
                {...register('maxTeamSize')}
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                {...register('status')}
              >
                {IDEA_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button type="submit" loading={saving}>
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(`/ideas/${id}`)}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default EditIdeaPage;
