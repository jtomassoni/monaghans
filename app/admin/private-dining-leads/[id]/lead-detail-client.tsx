'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import ConfirmationDialog from '@/components/confirmation-dialog';
import { showToast } from '@/components/toast';
import { inferReplyRecipient, replyEmailSubject } from '@/lib/email-threading';
import { extractConversationReplyPreview } from '@/lib/strip-email-reply-quotes';

type LeadEmail = {
  id: string;
  direction: string;
  from: string;
  to: string;
  subject: string;
  bodyText: string;
  createdAt: string | Date;
};

type LeadNote = {
  id: string;
  content: string;
  createdBy: string | null;
  createdAt: string | Date;
};

type LeadContact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  notes: string | null;
};

type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  groupSize: string;
  preferredDate: string | Date;
  message: string | null;
  status: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  emails: LeadEmail[];
  notes: LeadNote[];
  contacts: LeadContact[];
};

const AUTO_CREATION_NOTE_PREFIXES = [
  'Lead created from online form submission.',
  'Lead created manually in CRM.',
];
const ONLINE_SUBMISSION_NOTE_PREFIXES = [
  'Lead created from online form submission.',
  'New online form submission received.',
];

function isAutoCreationNote(note: LeadNote): boolean {
  return AUTO_CREATION_NOTE_PREFIXES.some((prefix) => note.content.startsWith(prefix));
}

function isOnlineSubmissionNote(note: LeadNote): boolean {
  return ONLINE_SUBMISSION_NOTE_PREFIXES.some((prefix) => note.content.startsWith(prefix));
}

const statusOptions = ['new', 'contacted', 'quoted', 'booked', 'cancelled', 'lost'] as const;

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200',
  contacted: 'bg-amber-100 text-amber-900 dark:bg-amber-950/45 dark:text-amber-200',
  quoted: 'bg-purple-100 text-purple-900 dark:bg-purple-950/45 dark:text-purple-200',
  booked: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/45 dark:text-emerald-200',
  cancelled: 'bg-rose-100 text-rose-900 dark:bg-rose-950/45 dark:text-rose-200',
  lost: 'bg-slate-200 text-slate-700 dark:bg-zinc-700/90 dark:text-zinc-200',
};

function formatDateTime(date: string | Date | number) {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function normalizeEmailSubject(subject: string | null | undefined) {
  const base = (subject ?? '').trim().toLowerCase() || '(no subject)';
  return base.replace(/^(re|fw|fwd):\s*/gi, '').trim() || '(no subject)';
}

const linkClass =
  'font-medium text-blue-700 underline-offset-2 hover:underline dark:text-indigo-300 dark:hover:text-indigo-200';

/** Poll for inbound/outbound email rows & timeline notes without overwriting unsaved profile draft (merge-only). */
const LEAD_TIMELINE_POLL_INTERVAL_MS = 45_000;

function parseSubmittedRequestFromNote(note: LeadNote): string {
  const lines = note.content.split('\n');
  const line =
    lines.find((l) => l.startsWith('Submitted message:')) ??
    lines.find((l) => l.startsWith('Party request details:'));
  return line ? line.replace(/^Submitted message:\s*|^Party request details:\s*/, '').trim() : '';
}

function parseOnlineSubmissionFields(note: LeadNote) {
  const lines = note.content.split('\n');
  const preferredRaw =
    lines.find((l) => l.startsWith('Preferred date:'))?.replace(/^Preferred date:\s*/, '').trim() ?? '';
  const groupSize =
    lines.find((l) => l.startsWith('Group size:'))?.replace(/^Group size:\s*/, '').trim() ?? '';
  const channel =
    lines.find((l) => l.startsWith('Submission channel:'))?.replace(/^Submission channel:\s*/, '').trim() ?? '';
  let preferredDisplay = preferredRaw;
  if (preferredRaw) {
    const d = new Date(preferredRaw);
    if (!isNaN(d.getTime())) preferredDisplay = formatDateTime(d);
  }
  return { preferredDisplay, groupSize, channel, request: parseSubmittedRequestFromNote(note) };
}

export default function LeadDetailClient({
  initialLead,
  hasStaffNotificationRecipients,
}: {
  initialLead: Lead;
  /** Active private-dining staff notification emails (Admin → Email alerts). */
  hasStaffNotificationRecipients: boolean;
}) {
  const router = useRouter();
  const [lead, setLead] = useState(initialLead);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resendingNotification, setResendingNotification] = useState(false);
  const [sending, setSending] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [showContactForm, setShowContactForm] = useState(false);
  const [composerMode, setComposerMode] = useState<'note' | 'email' | null>(null);
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    notes: '',
  });
  const [compose, setCompose] = useState({ subject: '', body: '', to: '' });
  const [editingProfileFields, setEditingProfileFields] = useState<
    Partial<Record<'name' | 'email' | 'phone' | 'status' | 'message', boolean>>
  >({});

  const [form, setForm] = useState({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    groupSize: lead.groupSize,
    preferredDate: new Date(lead.preferredDate).toISOString().split('T')[0],
    message: lead.message ?? '',
    status: lead.status,
  });

  const timeline = useMemo(() => {
    const emailsAsc = [...lead.emails].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const emailConversations = new Map<
      string,
      {
        key: string;
        subject: string;
        createdAt: number;
        type: 'email-conversation';
        emails: LeadEmail[];
      }
    >();

    for (const email of emailsAsc) {
      const subjectKey = normalizeEmailSubject(email.subject);
      const currentTimestamp = new Date(email.createdAt).getTime();
      const existing = emailConversations.get(subjectKey);
      if (existing) {
        existing.emails.push(email);
        existing.createdAt = Math.max(existing.createdAt, currentTimestamp);
      } else {
        emailConversations.set(subjectKey, {
          key: `email-thread-${subjectKey}`,
          subject: email.subject?.trim() || '(no subject)',
          createdAt: currentTimestamp,
          type: 'email-conversation',
          emails: [email],
        });
      }
    }
    const emailRows = Array.from(emailConversations.values());

    const onlineSubmissionRows = lead.notes
      .filter((note) => isOnlineSubmissionNote(note))
      .map((note) => ({
        key: `online-${note.id}`,
        createdAt: new Date(note.createdAt).getTime(),
        type: 'online-submission' as const,
        note,
      }));

    const noteRows = lead.notes
      .filter((note) => !isAutoCreationNote(note) && !isOnlineSubmissionNote(note))
      .map((note) => ({
        key: `note-${note.id}`,
        createdAt: new Date(note.createdAt).getTime(),
        type: 'note' as const,
        note,
      }));
    return [...emailRows, ...onlineSubmissionRows, ...noteRows].sort((a, b) => b.createdAt - a.createdAt);
  }, [lead.emails, lead.notes]);

  const creationNote = useMemo(
    () => lead.notes.find((note) => isAutoCreationNote(note)) ?? null,
    [lead.notes]
  );
  const latestOnlineSubmissionNote = useMemo(
    () =>
      [...lead.notes]
        .filter((note) => isOnlineSubmissionNote(note))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null,
    [lead.notes]
  );
  const createdFromOnline = creationNote?.content.startsWith(
    'Lead created from online form submission.'
  );

  // Full refresh from server props (browser reload, router.refresh(), navigate between leads)
  useEffect(() => {
    setLead(initialLead);
    setForm({
      name: initialLead.name,
      email: initialLead.email,
      phone: initialLead.phone,
      groupSize: initialLead.groupSize,
      preferredDate: new Date(initialLead.preferredDate).toISOString().split('T')[0],
      message: initialLead.message ?? '',
      status: initialLead.status,
    });
  }, [initialLead]);

  // Poll API for new emails / notes / contacts while this page is open (tab visible)
  useEffect(() => {
    const leadId = initialLead.id;
    let cancelled = false;

    async function mergeTimelineFromApi() {
      if (cancelled || document.visibilityState !== 'visible') return;
      try {
        const res = await fetch(`/api/private-dining-leads/${leadId}`, { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as Lead;
        if (cancelled || data.id !== leadId) return;
        setLead((prev) =>
          prev.id !== leadId
            ? prev
            : {
                ...prev,
                emails: data.emails ?? [],
                notes: data.notes ?? [],
                contacts: data.contacts ?? [],
                updatedAt: data.updatedAt,
              }
        );
      } catch {
        // ignore transient network errors during background poll
      }
    }

    void mergeTimelineFromApi();

    const intervalId = window.setInterval(mergeTimelineFromApi, LEAD_TIMELINE_POLL_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void mergeTimelineFromApi();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [initialLead.id]);

  async function refreshLead() {
    const res = await fetch(`/api/private-dining-leads/${lead.id}`, { cache: 'no-store' });
    if (!res.ok) return;
    const data = (await res.json()) as Lead;
    setLead(data);
    setForm({
      name: data.name,
      email: data.email,
      phone: data.phone,
      groupSize: data.groupSize,
      preferredDate: new Date(data.preferredDate).toISOString().split('T')[0],
      message: data.message ?? '',
      status: data.status,
    });
  }

  async function saveLead() {
    setSaving(true);
    try {
      const res = await fetch(`/api/private-dining-leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to update lead');
      const data = (await res.json()) as Lead;
      setLead(data);
      showToast('Lead updated', 'success');
      router.refresh();
    } catch {
      showToast('Failed to update lead', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function deleteLead() {
    try {
      const res = await fetch(`/api/private-dining-leads/${lead.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      showToast('Lead deleted', 'success');
      router.push('/admin/private-dining-leads');
    } catch {
      showToast('Failed to delete lead', 'error');
    }
  }

  async function addNote() {
    const content = newNote.trim();
    if (!content) return;
    try {
      const res = await fetch(`/api/private-dining-leads/${lead.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error('Failed');
      setNewNote('');
      setComposerMode(null);
      await refreshLead();
      showToast('Note added', 'success');
    } catch {
      showToast('Failed to add note', 'error');
    }
  }

  async function addContact() {
    if (!newContact.name.trim()) {
      showToast('Contact name is required', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/private-dining-leads/${lead.id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact),
      });
      if (!res.ok) throw new Error('Failed');
      setNewContact({ name: '', email: '', phone: '', role: '', notes: '' });
      setShowContactForm(false);
      await refreshLead();
      showToast('Contact added', 'success');
    } catch {
      showToast('Failed to add contact', 'error');
    }
  }

  async function sendEmail() {
    const subject = compose.subject.trim();
    const text = compose.body.trim();
    if (!subject || !text) {
      showToast('Subject and message are required', 'error');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/private-dining-leads/${lead.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, text, to: compose.to.trim() }),
      });
      const data = (await res.json()) as { error?: string; warning?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to send email');
      setCompose({ subject: '', body: '', to: '' });
      setComposerMode(null);
      await refreshLead();
      showToast(data.warning || 'Email sent', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to send email', 'error');
    } finally {
      setSending(false);
    }
  }

  async function resendLeadNotification() {
    setResendingNotification(true);
    try {
      const res = await fetch(`/api/private-dining-leads/${lead.id}/resend-notification`, {
        method: 'POST',
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to resend notification');
      showToast('Lead notification resent', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to resend notification', 'error');
    } finally {
      setResendingNotification(false);
    }
  }

  function beginReplyToEmail(email: LeadEmail) {
    const inferred = inferReplyRecipient(
      { direction: email.direction, from: email.from, to: email.to },
      lead.email ?? ''
    );
    setComposerMode('email');
    setCompose({
      subject: replyEmailSubject(email.subject),
      body: '',
      to: inferred ?? lead.email ?? '',
    });
  }

  function applyInquiryTemplate() {
    const name = lead.name?.trim() || 'there';
    setCompose((prev) => ({
      ...prev,
      subject: `Thanks for your inquiry, ${name}`,
      body: [
        `Hi ${name},`,
        '',
        'Thanks for your inquiry about hosting your event with us. To hold the space, we do require a deposit, and there is a 22% gratuity on any food and drinks sold.',
        '',
        'We offer several drink package options, including pre-paid tabs, drink tickets, cash bars, and more. If you share a few details about your event goals, we can recommend the best setup for your group.',
        '',
        "If you give me a good time, I can call you directly to collect the deposit and finalize details. I'm not in the bar every day, but feel free to call and ask for Victoria.",
        '',
        'Thanks again,',
        "Monaghan's Private Events Team",
      ].join('\n'),
    }));
  }

  function toggleProfileField(field: 'name' | 'email' | 'phone' | 'status' | 'message') {
    setEditingProfileFields((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-100/90 p-4 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:px-5">
          <div className="min-w-0">
            <Link href="/admin/private-dining-leads" className="text-xs text-slate-500 hover:text-slate-800 dark:text-zinc-500 dark:hover:text-zinc-200">
              ← All leads
            </Link>
            <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">{lead.name || 'Lead'}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[lead.status] ?? statusColors.new}`}>
              {lead.status}
            </span>
            {hasStaffNotificationRecipients ? (
              <button
                onClick={resendLeadNotification}
                disabled={resendingNotification}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100 disabled:opacity-60 dark:border-zinc-600 dark:bg-transparent dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {resendingNotification ? 'Resending...' : 'Resend notification'}
              </button>
            ) : null}
            <button onClick={saveLead} disabled={saving} className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-500">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setDeleteOpen(true)} className="rounded-lg border border-rose-200 bg-white px-3.5 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-500/35 dark:bg-transparent dark:text-rose-300 dark:hover:bg-rose-950/35">
              Delete
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700 dark:text-zinc-400">Lead Profile</h2>
              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-zinc-800/80 dark:bg-zinc-950/45">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-zinc-400">
                  Primary Contact
                </p>
                <div className="space-y-3 text-sm text-slate-900 dark:text-zinc-100">
                  <div className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900/80">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:text-zinc-500">Name</label>
                      <button
                        type="button"
                        onClick={() => toggleProfileField('name')}
                        className="rounded-md px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      >
                        {editingProfileFields.name ? 'Done' : 'Edit'}
                      </button>
                    </div>
                    {editingProfileFields.name ? (
                      <input
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Name"
                      />
                    ) : (
                      <p className="font-semibold">{lead.name || 'Unknown lead'}</p>
                    )}
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900/80">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">Email</label>
                      <button
                        type="button"
                        onClick={() => toggleProfileField('email')}
                        className="rounded-md px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      >
                        {editingProfileFields.email ? 'Done' : 'Edit'}
                      </button>
                    </div>
                    {editingProfileFields.email ? (
                      <input
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="Email"
                      />
                    ) : lead.email ? (
                      <a href={`mailto:${lead.email}`} className={`${linkClass} break-all`}>
                        {lead.email}
                      </a>
                    ) : (
                      <span className="text-slate-700 dark:text-slate-400">—</span>
                    )}
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900/80">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">Phone</label>
                      <button
                        type="button"
                        onClick={() => toggleProfileField('phone')}
                        className="rounded-md px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      >
                        {editingProfileFields.phone ? 'Done' : 'Edit'}
                      </button>
                    </div>
                    {editingProfileFields.phone ? (
                      <input
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="Phone"
                      />
                    ) : lead.phone ? (
                      <a href={`tel:${lead.phone}`} className={linkClass}>
                        {lead.phone}
                      </a>
                    ) : (
                      <span className="text-slate-700 dark:text-slate-400">—</span>
                    )}
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900/80">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">Status</label>
                      <button
                        type="button"
                        onClick={() => toggleProfileField('status')}
                        className="rounded-md px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      >
                        {editingProfileFields.status ? 'Done' : 'Edit'}
                      </button>
                    </div>
                    {editingProfileFields.status ? (
                      <select
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-medium text-slate-900 dark:text-slate-100">{lead.status}</span>
                    )}
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900/80">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">Inquiry Details</label>
                      <button
                        type="button"
                        onClick={() => toggleProfileField('message')}
                        className="rounded-md px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      >
                        {editingProfileFields.message ? 'Done' : 'Edit'}
                      </button>
                    </div>
                    {editingProfileFields.message ? (
                      <textarea
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        rows={4}
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        placeholder="Inquiry details"
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-slate-800 dark:text-slate-200">{lead.message || '—'}</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/95">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-700 dark:text-zinc-400">Contacts</h2>
                <button onClick={() => setShowContactForm((v) => !v)} className="rounded-md px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800">
                  {showContactForm ? 'Close' : 'Add'}
                </button>
              </div>
              {showContactForm && (
                <div className="mb-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-zinc-800/70 dark:bg-zinc-950/45">
                  <input className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" placeholder="Name*" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} />
                  <input className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" placeholder="Email" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} />
                  <input className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" placeholder="Phone" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} />
                  <input className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" placeholder="Role" value={newContact.role} onChange={(e) => setNewContact({ ...newContact, role: e.target.value })} />
                  <button onClick={addContact} className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                    Add contact
                  </button>
                </div>
              )}
              <div className="space-y-2">
                {lead.contacts.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">No additional contacts.</p> : null}
                {lead.contacts.map((contact) => (
                  <div key={contact.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm dark:border-zinc-800/70 dark:bg-zinc-950/45">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{contact.name}</p>
                    {contact.role ? <p className="text-slate-600 dark:text-slate-300">{contact.role}</p> : null}
                    {contact.email ? <p className="text-slate-600 dark:text-slate-300">{contact.email}</p> : null}
                    {contact.phone ? <p className="text-slate-600 dark:text-slate-300">{contact.phone}</p> : null}
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <main className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/95">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Conversation & Timeline</h2>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {timeline.length} items
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-zinc-700/85 dark:bg-zinc-950/40">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                    Add to timeline
                  </span>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900">
                      <button
                        type="button"
                        onClick={() => setComposerMode('note')}
                        className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                          composerMode === 'note'
                            ? 'bg-slate-900 text-white dark:bg-zinc-600 dark:text-white'
                            : 'text-slate-700 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                        }`}
                      >
                        Add note
                      </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCompose((c) => ({
                          ...c,
                          to: c.to.trim() === '' ? (lead.email ?? '') : c.to,
                        }));
                        setComposerMode('email');
                      }}
                      className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                        composerMode === 'email'
                          ? 'bg-slate-900 text-white dark:bg-zinc-600 dark:text-white'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                      }`}
                    >
                      Email
                    </button>
                    </div>
                    {composerMode !== null ? (
                      <button
                        type="button"
                        onClick={() => setComposerMode(null)}
                        className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/80 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </div>

                {composerMode === 'email' ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/80">
                    <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Outgoing draft</p>
                    <div className="mb-3 space-y-1.5">
                      <label
                        htmlFor="compose-email-to"
                        className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-zinc-400"
                      >
                        To
                      </label>
                      <input
                        id="compose-email-to"
                        type="text"
                        autoComplete="email"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                        placeholder={lead.email ? lead.email : 'recipient@example.com'}
                        value={compose.to}
                        onChange={(e) => setCompose({ ...compose, to: e.target.value })}
                      />
                      <p className="text-xs leading-snug text-slate-500 dark:text-zinc-500">
                        Prefilled from the lead’s primary email. Edit or add more addresses separated by commas.
                      </p>
                    </div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                        Templates
                      </span>
                      <button
                        type="button"
                        onClick={applyInquiryTemplate}
                        className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-500"
                      >
                        Inquiry + deposit + gratuity
                      </button>
                    </div>
                    <div className="space-y-2">
                      <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500" placeholder="Subject" value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} />
                      <textarea className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500" rows={5} placeholder="Write your message..." value={compose.body} onChange={(e) => setCompose({ ...compose, body: e.target.value })} />
                      <div className="flex justify-end border-t border-slate-200 pt-3 dark:border-zinc-700">
                        <button
                          type="button"
                          onClick={sendEmail}
                          disabled={sending}
                          className="rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-md ring-2 ring-[var(--color-accent)]/35 transition hover:brightness-105 disabled:opacity-60 dark:ring-[var(--color-accent)]/25"
                        >
                          {sending ? 'Sending…' : 'Send email'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
                {composerMode === 'note' ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/80">
                    <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Internal note</p>
                    <textarea className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500" rows={3} placeholder="Add internal note..." value={newNote} onChange={(e) => setNewNote(e.target.value)} />
                    <div className="mt-2 flex justify-end">
                      <button onClick={addNote} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
                        Add note
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 space-y-2">
                {!createdFromOnline ? (
                  <article className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-zinc-700/85 dark:bg-zinc-950/40">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                        Lead created in CRM
                      </p>
                      <time className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(lead.createdAt)}</time>
                    </div>
                    {creationNote ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">{creationNote.content}</p>
                    ) : (
                      <p className="text-sm text-slate-800 dark:text-slate-200">
                        Lead record created at {formatDateTime(lead.createdAt)}.
                      </p>
                    )}
                  </article>
                ) : null}
                {timeline.length === 0 ? (
                  <p className="text-sm text-slate-600 dark:text-slate-400">No timeline activity yet.</p>
                ) : null}
                {timeline.map((item) => {
                  if (item.type === 'email-conversation') {
                    return (
                    <article
                      key={item.key}
                      className="overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-none"
                    >
                      <div className="border-b border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
                            Email conversation
                          </p>
                          <time className="text-xs font-medium tabular-nums text-slate-700 dark:text-slate-200">
                            {formatDateTime(item.createdAt)}
                          </time>
                        </div>
                        <p className="mt-2 text-base font-semibold leading-snug text-slate-900 dark:text-white">
                          {item.subject}
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                          {item.emails.length} message{item.emails.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="space-y-3 p-3">
                        {[...item.emails]
                          .sort(
                            (a, b) =>
                              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                          )
                          .map((email) => {
                          const outbound = email.direction === 'outbound';
                          return (
                            <div
                              key={email.id}
                              className={`max-w-[min(100%,42rem)] overflow-hidden rounded-xl border-2 ${
                                outbound
                                  ? 'ml-auto border-indigo-400/70 bg-indigo-50 dark:border-indigo-400/35 dark:bg-indigo-950/45'
                                  : 'mr-auto border-slate-300 bg-slate-50 dark:border-zinc-600 dark:bg-zinc-900/85'
                              }`}
                            >
                              <div
                                className={`flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 ${
                                  outbound
                                    ? 'border-indigo-200 bg-indigo-50/95 dark:border-indigo-400/25 dark:bg-indigo-950/55'
                                    : 'border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-950/75'
                                }`}
                              >
                                <span className="text-xs font-bold uppercase tracking-wide text-slate-800 dark:text-slate-100">
                                  {outbound ? 'Sent' : 'Received'}
                                </span>
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => beginReplyToEmail(email)}
                                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 shadow-sm hover:bg-slate-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                                  >
                                    Reply
                                  </button>
                                  <time className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                                    {formatDateTime(email.createdAt)}
                                  </time>
                                </div>
                              </div>
                              <div className="space-y-1 border-b border-slate-200 bg-slate-100/60 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950/55">
                                <p className="break-words text-slate-800 dark:text-slate-200">
                                  <span className="font-semibold text-slate-600 dark:text-slate-400">From </span>
                                  {email.from}
                                </p>
                                <p className="break-words text-slate-800 dark:text-slate-200">
                                  <span className="font-semibold text-slate-600 dark:text-slate-400">To </span>
                                  {email.to}
                                </p>
                              </div>
                              <div className="px-3 py-3">
                                <p className="whitespace-pre-wrap text-[15px] leading-[1.65] text-slate-900 dark:text-slate-50">
                                  {outbound
                                    ? email.bodyText
                                    : extractConversationReplyPreview(email.bodyText)}
                                </p>
                              </div>
                            </div>
                          );
                          })}
                      </div>
                    </article>
                    );
                  }
                  if (item.type === 'online-submission') {
                    const fields = parseOnlineSubmissionFields(item.note);
                    const isLatest = item.note.id === latestOnlineSubmissionNote?.id;
                    return (
                      <article
                        key={item.key}
                        className={`rounded-lg border bg-white p-3 dark:bg-zinc-900/95 ${
                          isLatest
                            ? 'border-l-4 border-l-[var(--color-accent)] ring-1 ring-slate-200 dark:border-l-[var(--color-accent)] dark:ring-zinc-700'
                            : 'border-slate-200 dark:border-zinc-700'
                        }`}
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                              Online form submission
                            </p>
                            {isLatest ? (
                              <span className="rounded-full bg-[var(--color-accent)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent)] dark:bg-[var(--color-accent)]/18 dark:text-zinc-100">
                                Most recent
                              </span>
                            ) : null}
                          </div>
                          <time className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(item.note.createdAt)}</time>
                        </div>
                        <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm text-slate-800 dark:text-slate-200 sm:grid-cols-2">
                          <p>
                            <span className="text-slate-500 dark:text-slate-400">Name </span>
                            <span className="font-medium">{lead.name || '—'}</span>
                          </p>
                          <p>
                            <span className="text-slate-500 dark:text-slate-400">Email </span>
                            {lead.email ? (
                              <a href={`mailto:${lead.email}`} className={`${linkClass} break-all`}>
                                {lead.email}
                              </a>
                            ) : (
                              '—'
                            )}
                          </p>
                          <p>
                            <span className="text-slate-500 dark:text-slate-400">Phone </span>
                            {lead.phone ? (
                              <a href={`tel:${lead.phone}`} className={linkClass}>
                                {lead.phone}
                              </a>
                            ) : (
                              '—'
                            )}
                          </p>
                          <p>
                            <span className="text-slate-500 dark:text-slate-400">Group size </span>
                            <span>{fields.groupSize || lead.groupSize || '—'}</span>
                          </p>
                          <p className="sm:col-span-2">
                            <span className="text-slate-500 dark:text-slate-400">Preferred date </span>
                            <span>{fields.preferredDisplay || formatDateTime(lead.preferredDate)}</span>
                          </p>
                          {fields.channel ? (
                            <p className="sm:col-span-2 text-xs text-slate-500 dark:text-slate-400">{fields.channel}</p>
                          ) : null}
                          {fields.request ? (
                            <div className="sm:col-span-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950/70">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Request</p>
                              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-900 dark:text-slate-100">{fields.request}</p>
                            </div>
                          ) : null}
                        </div>
                      </article>
                    );
                  }
                  return (
                    <article key={item.key} className="rounded-lg border border-amber-200/90 bg-amber-50/90 p-3 dark:border-amber-800/50 dark:bg-amber-950/25">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">Staff note</p>
                        <time className="text-xs text-amber-800/90 dark:text-amber-300/90">{formatDateTime(item.note.createdAt)}</time>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-amber-950 dark:text-amber-50">{item.note.content}</p>
                    </article>
                  );
                })}
              </div>
            </section>
          </main>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={deleteLead}
        title="Delete lead"
        message="Are you sure you want to delete this lead? This cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
