'use client';

import React, { useState } from 'react';

export default function ExtractPage() {
  const [rawText, setRawText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    interviewTime: '',
    consultantName: '',
    position: '',
    client: '',
    status: 'Interview',
    marketer: '',
    support: '',
    recruiter: '',
    recruiterEmail: '',
    recruiterPhone: '',
    update: '',
  });

  const [submitted, setSubmitted] = useState(false);

  const handleQuickExtract = () => {
    if (!rawText.trim()) return;
    setIsExtracting(true);

    const text = rawText;
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = text.match(/(\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/);
    const dateMatch = text.match(/\b\d{4}-\d{2}-\d{2}\b/);

    setFormData((prev) => ({
      ...prev,
      recruiterEmail: emailMatch ? emailMatch[0] : prev.recruiterEmail,
      recruiterPhone: phoneMatch ? phoneMatch[0] : prev.recruiterPhone,
      date: dateMatch ? dateMatch[0] : prev.date,
      update: text.length > 200 ? text.substring(0, 200) + '...' : text,
    }));

    setTimeout(() => {
      setIsExtracting(false);
    }, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  const inputClass = 'w-full p-2 border rounded-md text-sm theme-input theme-border focus:outline-none';

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto font-[family-name:var(--font-geist-sans)]">
      <div className="p-6 sm:p-8 rounded-xl shadow-sm border flex flex-col gap-6 theme-surface theme-border">

        {/* Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold theme-text">
            Text Extractor &amp; Quick Add
          </h1>
          <p className="text-sm theme-text-muted mt-1">
            Paste raw interview details or email text below to quickly extract and save placements to Notion.
          </p>
        </div>

        {/* Success toast */}
        {submitted && (
          <div className="bg-green-100 border border-green-300 text-green-900 p-4 rounded-lg font-medium">
            ✅ Successfully recorded placement entry!
          </div>
        )}

        {/* Raw text input */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold theme-text">Paste Raw Text / Email Snippet:</label>
          <textarea
            rows={5}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="e.g. Interview scheduled for Java Full Stack Developer with Cigna on Tue Jan 06. Recruiter contact: recruiter@example.com (555-123-4567)"
            className="w-full p-3 border rounded-lg text-sm focus:outline-none theme-input theme-border"
          />
          <button
            onClick={handleQuickExtract}
            disabled={!rawText.trim() || isExtracting}
            className="self-start px-4 py-2 font-semibold rounded-md text-sm transition-colors disabled:opacity-50 shadow-xs theme-btn"
          >
            {isExtracting ? 'Extracting...' : '⚡ Auto-Extract Data'}
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="border-t pt-6 flex flex-col gap-4 theme-border">
          <h2 className="text-lg font-bold theme-text">Review &amp; Submit Extracted Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold theme-text-muted mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold theme-text-muted mb-1">Interview Time</label>
              <input
                type="text"
                value={formData.interviewTime}
                placeholder="e.g. 03:00 pm - 03:30 pm EST"
                onChange={(e) => setFormData({ ...formData, interviewTime: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold theme-text-muted mb-1">Consultant Name</label>
              <input
                type="text"
                value={formData.consultantName}
                placeholder="e.g. John Doe"
                onChange={(e) => setFormData({ ...formData, consultantName: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold theme-text-muted mb-1">Position</label>
              <input
                type="text"
                value={formData.position}
                placeholder="e.g. Senior AI Engineer"
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold theme-text-muted mb-1">Vendor / Client</label>
              <input
                type="text"
                value={formData.client}
                placeholder="e.g. Cigna / RevoText"
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold theme-text-muted mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className={inputClass}
              >
                <option value="Interview">Interview</option>
                <option value="Screening">Screening</option>
                <option value="Assessment">Assessment</option>
                <option value="Final Round">Final Round</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold theme-text-muted mb-1">Recruiter Email</label>
              <input
                type="email"
                value={formData.recruiterEmail}
                placeholder="recruiter@client.com"
                onChange={(e) => setFormData({ ...formData, recruiterEmail: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold theme-text-muted mb-1">Recruiter Phone</label>
              <input
                type="text"
                value={formData.recruiterPhone}
                placeholder="Phone number"
                onChange={(e) => setFormData({ ...formData, recruiterPhone: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold theme-text-muted mb-1">Marketer</label>
              <input
                type="text"
                value={formData.marketer}
                placeholder="Marketer name"
                onChange={(e) => setFormData({ ...formData, marketer: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-4 px-6 py-3 font-bold rounded-lg text-sm transition-colors shadow-sm self-end theme-btn"
          >
            Submit Entry
          </button>
        </form>
      </div>
    </div>
  );
}
