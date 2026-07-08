import React from 'react';

export interface ResumeContent {
  personal: {
    name: string;
    email: string;
    phone: string;
    website: string;
    socialLinks?: {
      platform: 'linkedin' | 'github' | 'instagram' | 'facebook' | 'website';
      url: string;
    }[];
    summary: string;
  };
  experience: {
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    description: string;
  }[];
  education: {
    school: string;
    degree: string;
    startDate: string;
    endDate: string;
    description: string;
  }[];
  skills: string[];
  projects: {
    name: string;
    description: string;
    link: string;
  }[];
}

interface ResumePreviewProps {
  content: ResumeContent;
}

function getSocialIcon(platform: string) {
  switch (platform) {
    case 'linkedin':
      return (
        <svg className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
          <rect x="2" y="9" width="4" height="12"/>
          <circle cx="4" cy="4" r="2"/>
        </svg>
      );
    case 'github':
      return (
        <svg className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
          <path d="M9 18c-4.51 2-5-2-7-2"/>
        </svg>
      );
    case 'instagram':
      return (
        <svg className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
        </svg>
      );
    case 'facebook':
      return (
        <svg className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
        </svg>
      );
    default:
      return (
        <svg className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      );
  }
}

export function ResumePreview({ content }: ResumePreviewProps) {
  const { personal, experience, education, skills, projects } = content;

  return (
    <div 
      id="resume-preview-sheet"
      className="w-[210mm] min-h-[297mm] p-[20mm] bg-white text-black shadow-lg mx-auto print:shadow-none print:p-0 select-text transition-all duration-300 font-serif leading-normal text-sm"
      style={{
        boxSizing: 'border-box',
      }}
    >
      {/* Personal Info / Header */}
      <header className="text-center border-b border-neutral-300 pb-5 mb-6">
        <h1 className="text-3xl font-bold tracking-tight uppercase font-sans mb-1.5">
          {personal.name || 'Your Name'}
        </h1>
        <div className="flex justify-center flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600 font-sans font-medium">
          {personal.email && (
            <span>{personal.email}</span>
          )}
          {personal.phone && (
            <span>• {personal.phone}</span>
          )}
          {personal.website && (!personal.socialLinks || personal.socialLinks.length === 0) && (
            <span>• {personal.website}</span>
          )}
        </div>
        
        {/* Render Social Links with Icons */}
        {personal.socialLinks && personal.socialLinks.length > 0 && (
          <div className="flex justify-center flex-wrap gap-x-4 gap-y-1.5 text-xs text-neutral-600 font-sans font-medium mt-2">
            {personal.socialLinks.map((link, idx) => (
              <span key={idx} className="flex items-center gap-1">
                {getSocialIcon(link.platform)}
                <a 
                  href={link.url.startsWith('http') ? link.url : `https://${link.url}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:underline text-[11px] text-neutral-650"
                >
                  {link.url.replace(/^https?:\/\/(www\.)?/, '') || link.platform}
                </a>
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Professional Summary */}
      {personal.summary && (
        <section className="mb-6">
          <h2 className="text-xs font-bold tracking-wider uppercase font-sans border-b border-neutral-200 pb-1 mb-2 text-neutral-800">
            Professional Summary
          </h2>
          <p className="text-neutral-700 text-justify text-xs leading-relaxed">
            {personal.summary}
          </p>
        </section>
      )}

      {/* Work Experience */}
      {experience && experience.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold tracking-wider uppercase font-sans border-b border-neutral-200 pb-1 mb-3 text-neutral-800">
            Work Experience
          </h2>
          <div className="space-y-4">
            {experience.map((exp, idx) => (
              <div key={idx} className="print:avoid-break">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-bold text-xs font-sans text-neutral-900">
                    {exp.position || 'Position'} <span className="font-normal text-neutral-500">at</span> {exp.company || 'Company'}
                  </h3>
                  <span className="text-[10px] font-medium text-neutral-500 font-sans">
                    {exp.startDate || 'Start'} — {exp.endDate || 'Present'}
                  </span>
                </div>
                <p className="text-neutral-700 text-xs whitespace-pre-line leading-relaxed pl-1">
                  {exp.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {education && education.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold tracking-wider uppercase font-sans border-b border-neutral-200 pb-1 mb-3 text-neutral-800">
            Education
          </h2>
          <div className="space-y-3">
            {education.map((edu, idx) => (
              <div key={idx} className="print:avoid-break">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className="font-bold text-xs font-sans text-neutral-900">
                    {edu.degree || 'Degree/Certificate'}
                  </h3>
                  <span className="text-[10px] font-medium text-neutral-500 font-sans">
                    {edu.startDate || 'Start'} — {edu.endDate || 'End'}
                  </span>
                </div>
                <div className="text-xs text-neutral-600 font-medium mb-1">{edu.school || 'School'}</div>
                {edu.description && (
                  <p className="text-neutral-700 text-xs leading-relaxed pl-1">
                    {edu.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {projects && projects.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold tracking-wider uppercase font-sans border-b border-neutral-200 pb-1 mb-3 text-neutral-800">
            Key Projects
          </h2>
          <div className="space-y-3">
            {projects.map((proj, idx) => (
              <div key={idx} className="print:avoid-break">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className="font-bold text-xs font-sans text-neutral-900">
                    {proj.name || 'Project Name'}
                  </h3>
                  {proj.link && (
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {proj.link}
                    </span>
                  )}
                </div>
                <p className="text-neutral-700 text-xs leading-relaxed pl-1">
                  {proj.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {skills && skills.length > 0 && (
        <section>
          <h2 className="text-xs font-bold tracking-wider uppercase font-sans border-b border-neutral-200 pb-1 mb-2 text-neutral-800">
            Skills
          </h2>
          <div className="flex flex-wrap gap-1.5 pl-1">
            {skills.map((skill, idx) => (
              <span 
                key={idx} 
                className="text-[11px] font-medium font-sans text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
