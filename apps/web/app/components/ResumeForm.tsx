'use client';

import React, { useState } from 'react';
import { ResumeContent } from './ResumePreview';
import { Plus, Trash, User, Briefcase, GraduationCap, Code, FolderGit } from 'lucide-react';

interface ResumeFormProps {
  initialContent: ResumeContent;
  onChange: (content: ResumeContent) => void;
  onSave: () => void;
  saving: boolean;
}

type TabType = 'personal' | 'experience' | 'education' | 'projects' | 'skills';

export function ResumeForm({ initialContent, onChange, onSave, saving }: ResumeFormProps) {
  const [activeTab, setActiveTab] = useState<TabType>('personal');
  const [content, setContent] = useState<ResumeContent>(initialContent);

  const updateContent = (newContent: ResumeContent) => {
    setContent(newContent);
    onChange(newContent);
  };

  // --- Personal Information updates ---
  const handlePersonalChange = (field: keyof ResumeContent['personal'], value: string) => {
    const newContent = {
      ...content,
      personal: {
        ...content.personal,
        [field]: value,
      },
    };
    updateContent(newContent);
  };

  // --- Social Links Updates ---
  const handleSocialLinkChange = (idx: number, field: 'platform' | 'url', value: string) => {
    const newLinks = [...(content.personal.socialLinks || [])];
    newLinks[idx] = { ...newLinks[idx], [field]: value };
    const newContent = {
      ...content,
      personal: {
        ...content.personal,
        socialLinks: newLinks,
      },
    };
    updateContent(newContent);
  };

  const addSocialLink = () => {
    const newLinks = [...(content.personal.socialLinks || []), { platform: 'website' as const, url: '' }];
    const newContent = {
      ...content,
      personal: {
        ...content.personal,
        socialLinks: newLinks,
      },
    };
    updateContent(newContent);
  };

  const removeSocialLink = (idx: number) => {
    const newLinks = (content.personal.socialLinks || []).filter((_, i) => i !== idx);
    const newContent = {
      ...content,
      personal: {
        ...content.personal,
        socialLinks: newLinks,
      },
    };
    updateContent(newContent);
  };

  // --- Experience Updates ---
  const handleExperienceChange = (idx: number, field: string, value: string) => {
    const newExp = [...content.experience];
    newExp[idx] = { ...newExp[idx], [field]: value };
    updateContent({ ...content, experience: newExp });
  };

  const addExperience = () => {
    const newExp = [
      ...content.experience,
      { company: '', position: '', startDate: '', endDate: '', description: '' },
    ];
    updateContent({ ...content, experience: newExp });
  };

  const removeExperience = (idx: number) => {
    const newExp = content.experience.filter((_, i) => i !== idx);
    updateContent({ ...content, experience: newExp });
  };

  // --- Education Updates ---
  const handleEducationChange = (idx: number, field: string, value: string) => {
    const newEdu = [...content.education];
    newEdu[idx] = { ...newEdu[idx], [field]: value };
    updateContent({ ...content, education: newEdu });
  };

  const addEducation = () => {
    const newEdu = [
      ...content.education,
      { school: '', degree: '', startDate: '', endDate: '', description: '' },
    ];
    updateContent({ ...content, education: newEdu });
  };

  const removeEducation = (idx: number) => {
    const newEdu = content.education.filter((_, i) => i !== idx);
    updateContent({ ...content, education: newEdu });
  };

  // --- Projects Updates ---
  const handleProjectChange = (idx: number, field: string, value: string) => {
    const newProj = [...content.projects];
    newProj[idx] = { ...newProj[idx], [field]: value };
    updateContent({ ...content, projects: newProj });
  };

  const addProject = () => {
    const newProj = [
      ...content.projects,
      { name: '', description: '', link: '' },
    ];
    updateContent({ ...content, projects: newProj });
  };

  const removeProject = (idx: number) => {
    const newProj = content.projects.filter((_, i) => i !== idx);
    updateContent({ ...content, projects: newProj });
  };

  // --- Skills Updates ---
  const handleSkillsChange = (val: string) => {
    const skillsArray = val
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    updateContent({ ...content, skills: skillsArray });
  };

  const tabs: { type: TabType; label: string; icon: any }[] = [
    { type: 'personal', label: 'Contact', icon: User },
    { type: 'experience', label: 'Work', icon: Briefcase },
    { type: 'education', label: 'Education', icon: GraduationCap },
    { type: 'projects', label: 'Projects', icon: FolderGit },
    { type: 'skills', label: 'Skills', icon: Code },
  ];

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex flex-col h-[780px]">
      {/* Editor Header with Save button */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
          Resume Editor
        </h3>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-semibold bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 hover:bg-neutral-850 dark:hover:bg-neutral-200 rounded-lg active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800 mb-6 overflow-x-auto gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.type;
          return (
            <button
              key={tab.type}
              onClick={() => setActiveTab(tab.type)}
              className={`flex items-center gap-1.5 pb-3.5 px-2 text-sm font-semibold border-b-2 transition-all ${
                isActive
                  ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
                  : 'border-transparent text-neutral-450 dark:text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto pr-1">
        {/* Personal Form */}
        {activeTab === 'personal' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={content.personal.name}
                onChange={(e) => handlePersonalChange('name', e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-4 focus:ring-neutral-500/20 text-neutral-900 dark:text-neutral-100"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={content.personal.email}
                  onChange={(e) => handlePersonalChange('email', e.target.value)}
                  placeholder="johndoe@example.com"
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-4 focus:ring-neutral-500/20 text-neutral-900 dark:text-neutral-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={content.personal.phone}
                  onChange={(e) => handlePersonalChange('phone', e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-4 focus:ring-neutral-500/20 text-neutral-900 dark:text-neutral-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2">
                Social Links & Websites
              </label>
              
              <div className="space-y-3 mb-3">
                {(content.personal.socialLinks || []).map((link, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      value={link.platform}
                      onChange={(e) => handleSocialLinkChange(idx, 'platform', e.target.value)}
                      className="px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs font-bold text-neutral-850 dark:text-neutral-200 focus:outline-none"
                    >
                      <option value="website">Website</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="github">GitHub</option>
                      <option value="instagram">Instagram</option>
                      <option value="facebook">Facebook</option>
                    </select>
                    <input
                      type="text"
                      value={link.url}
                      onChange={(e) => handleSocialLinkChange(idx, 'url', e.target.value)}
                      placeholder={
                        link.platform === 'linkedin' ? 'linkedin.com/in/username' :
                        link.platform === 'github' ? 'github.com/username' :
                        link.platform === 'instagram' ? 'instagram.com/username' :
                        link.platform === 'facebook' ? 'facebook.com/username' :
                        'https://mywebsite.com'
                      }
                      className="flex-1 px-4 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-305 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeSocialLink(idx)}
                      className="p-2 text-neutral-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addSocialLink}
                className="py-1.5 px-3 flex items-center gap-1.5 border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-neutral-450 text-neutral-600 dark:text-neutral-400 text-xs font-semibold rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add URL / Social Link
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                Professional Summary
              </label>
              <textarea
                rows={5}
                value={content.personal.summary}
                onChange={(e) => handlePersonalChange('summary', e.target.value)}
                placeholder="Results-driven Software Engineer with 5+ years of experience building responsive, performant web applications..."
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-4 focus:ring-neutral-500/20 text-neutral-900 dark:text-neutral-100 resize-none"
              />
            </div>
          </div>
        )}

        {/* Experience Form */}
        {activeTab === 'experience' && (
          <div className="space-y-6">
            {content.experience.map((exp, idx) => (
              <div key={idx} className="p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 rounded-xl space-y-4 relative">
                <button
                  type="button"
                  onClick={() => removeExperience(idx)}
                  className="absolute top-4 right-4 text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1"
                >
                  <Trash className="w-4.5 h-4.5" />
                </button>
                <div className="text-sm font-bold text-neutral-850 dark:text-neutral-200">
                  Experience #{idx + 1}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Company</label>
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) => handleExperienceChange(idx, 'company', e.target.value)}
                      placeholder="Tech Corp"
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-800 rounded-md text-sm text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Position</label>
                    <input
                      type="text"
                      value={exp.position}
                      onChange={(e) => handleExperienceChange(idx, 'position', e.target.value)}
                      placeholder="Senior Engineer"
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-800 rounded-md text-sm text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Start Date</label>
                    <input
                      type="text"
                      value={exp.startDate}
                      onChange={(e) => handleExperienceChange(idx, 'startDate', e.target.value)}
                      placeholder="Jan 2022"
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-800 rounded-md text-sm text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">End Date</label>
                    <input
                      type="text"
                      value={exp.endDate}
                      onChange={(e) => handleExperienceChange(idx, 'endDate', e.target.value)}
                      placeholder="Present"
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-800 rounded-md text-sm text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Description</label>
                  <textarea
                    rows={4}
                    value={exp.description}
                    onChange={(e) => handleExperienceChange(idx, 'description', e.target.value)}
                    placeholder="Describe achievements (e.g. • Led team of 4 to deliver Next.js dashboard)"
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-800 rounded-md text-sm text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900 resize-none"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addExperience}
              className="w-full py-2.5 flex items-center justify-center gap-1.5 border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-neutral-450 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-neutral-600 dark:text-neutral-400 text-sm font-semibold rounded-xl transition"
            >
              <Plus className="w-4 h-4" />
              Add Experience
            </button>
          </div>
        )}

        {/* Education Form */}
        {activeTab === 'education' && (
          <div className="space-y-6">
            {content.education.map((edu, idx) => (
              <div key={idx} className="p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 rounded-xl space-y-4 relative">
                <button
                  type="button"
                  onClick={() => removeEducation(idx)}
                  className="absolute top-4 right-4 text-red-500 hover:text-red-700 p-1"
                >
                  <Trash className="w-4.5 h-4.5" />
                </button>
                <div className="text-sm font-bold text-neutral-850 dark:text-neutral-200">
                  Education #{idx + 1}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">School</label>
                    <input
                      type="text"
                      value={edu.school}
                      onChange={(e) => handleEducationChange(idx, 'school', e.target.value)}
                      placeholder="University of Tech"
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-800 rounded-md text-sm text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Degree / Major</label>
                    <input
                      type="text"
                      value={edu.degree}
                      onChange={(e) => handleEducationChange(idx, 'degree', e.target.value)}
                      placeholder="Bachelor of Science in CS"
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-800 rounded-md text-sm text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Start Date</label>
                    <input
                      type="text"
                      value={edu.startDate}
                      onChange={(e) => handleEducationChange(idx, 'startDate', e.target.value)}
                      placeholder="2018"
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-800 rounded-md text-sm text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">End Date</label>
                    <input
                      type="text"
                      value={edu.endDate}
                      onChange={(e) => handleEducationChange(idx, 'endDate', e.target.value)}
                      placeholder="2022"
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-800 rounded-md text-sm text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addEducation}
              className="w-full py-2.5 flex items-center justify-center gap-1.5 border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-neutral-450 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-neutral-600 dark:text-neutral-400 text-sm font-semibold rounded-xl transition"
            >
              <Plus className="w-4 h-4" />
              Add Education
            </button>
          </div>
        )}

        {/* Projects Form */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            {content.projects.map((proj, idx) => (
              <div key={idx} className="p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 rounded-xl space-y-4 relative">
                <button
                  type="button"
                  onClick={() => removeProject(idx)}
                  className="absolute top-4 right-4 text-red-500 hover:text-red-700 p-1"
                >
                  <Trash className="w-4.5 h-4.5" />
                </button>
                <div className="text-sm font-bold text-neutral-850 dark:text-neutral-200">
                  Project #{idx + 1}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Project Name</label>
                    <input
                      type="text"
                      value={proj.name}
                      onChange={(e) => handleProjectChange(idx, 'name', e.target.value)}
                      placeholder="My Portfolio App"
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-800 rounded-md text-sm text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Project Link</label>
                    <input
                      type="text"
                      value={proj.link}
                      onChange={(e) => handleProjectChange(idx, 'link', e.target.value)}
                      placeholder="github.com/my-project"
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-800 rounded-md text-sm text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Project Description</label>
                  <textarea
                    rows={3}
                    value={proj.description}
                    onChange={(e) => handleProjectChange(idx, 'description', e.target.value)}
                    placeholder="Describe project features, stack, and contributions..."
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-800 rounded-md text-sm text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900 resize-none"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addProject}
              className="w-full py-2.5 flex items-center justify-center gap-1.5 border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-neutral-450 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-neutral-600 dark:text-neutral-400 text-sm font-semibold rounded-xl transition"
            >
              <Plus className="w-4 h-4" />
              Add Project
            </button>
          </div>
        )}

        {/* Skills Form */}
        {activeTab === 'skills' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                Skills (Comma Separated)
              </label>
              <textarea
                rows={5}
                value={content.skills.join(', ')}
                onChange={(e) => handleSkillsChange(e.target.value)}
                placeholder="TypeScript, React, Next.js, Flutter, Node.js, PostgreSQL"
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-4 focus:ring-neutral-500/20 text-neutral-900 dark:text-neutral-100 resize-none"
              />
              <p className="mt-2 text-xs text-neutral-400">
                Tip: Enter skills separated by commas to add them as individual items.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
