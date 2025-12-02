'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { showToast } from '@/components/toast';
import StatusBadge from '@/components/status-badge';
import ConfirmationDialog from '@/components/confirmation-dialog';

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  groupSize: string;
  preferredDate: Date;
  message: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  notes: Array<{
    id: string;
    content: string;
    createdBy: string | null;
    createdAt: Date;
  }>;
  contacts: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string | null;
    notes: string | null;
  }>;
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  contacted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  quoted: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  booked: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  lost: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

export default function LeadDetailClient({ initialLead }: { initialLead: Lead }) {
  const router = useRouter();
  const [lead, setLead] = useState(initialLead);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '', role: '', notes: '' });

  const [formData, setFormData] = useState({
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    groupSize: lead.groupSize,
    preferredDate: new Date(lead.preferredDate).toISOString().split('T')[0],
    message: lead.message || '',
    status: lead.status,
  });

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/private-dining-leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update lead');
      }

      const updatedLead = await response.json();
      setLead(updatedLead);
      setIsEditing(false);
      showToast('Lead updated successfully', 'success');
      router.refresh();
    } catch (error) {
      showToast('Failed to update lead', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/private-dining-leads/${lead.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete lead');
      }

      showToast('Lead deleted successfully', 'success');
      router.push('/admin/private-dining-leads');
    } catch (error) {
      showToast('Failed to delete lead', 'error');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      const response = await fetch(`/api/private-dining-leads/${lead.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote }),
      });

      if (!response.ok) {
        throw new Error('Failed to add note');
      }

      const note = await response.json();
      setLead({ ...lead, notes: [note, ...lead.notes] });
      setNewNote('');
      setShowNoteForm(false);
      showToast('Note added successfully', 'success');
      router.refresh();
    } catch (error) {
      showToast('Failed to add note', 'error');
    }
  };

  const handleAddContact = async () => {
    if (!newContact.name.trim()) {
      showToast('Contact name is required', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/private-dining-leads/${lead.id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact),
      });

      if (!response.ok) {
        throw new Error('Failed to add contact');
      }

      const contact = await response.json();
      setLead({ ...lead, contacts: [...lead.contacts, contact] });
      setNewContact({ name: '', email: '', phone: '', role: '', notes: '' });
      setShowContactForm(false);
      showToast('Contact added successfully', 'success');
      router.refresh();
    } catch (error) {
      showToast('Failed to add contact', 'error');
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-3 sm:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/private-dining-leads"
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-[var(--color-accent)]"
            >
              ← Back
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {isEditing ? 'Edit Lead' : lead.name}
            </h1>
            <StatusBadge
              status={lead.status}
              statusMap={{
                new: { label: 'New', color: statusColors.new },
                contacted: { label: 'Contacted', color: statusColors.contacted },
                quoted: { label: 'Quoted', color: statusColors.quoted },
                booked: { label: 'Booked', color: statusColors.booked },
                cancelled: { label: 'Cancelled', color: statusColors.cancelled },
                lost: { label: 'Lost', color: statusColors.lost },
              }}
            />
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteConfirmation(true)}
                  className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition"
                >
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      name: lead.name,
                      phone: lead.phone,
                      email: lead.email,
                      groupSize: lead.groupSize,
                      preferredDate: new Date(lead.preferredDate).toISOString().split('T')[0],
                      message: lead.message || '',
                      status: lead.status,
                    });
                  }}
                  className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main Content - Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Lead Information */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-base font-bold mb-3 text-gray-900 dark:text-white">Lead Information</h2>
            {isEditing ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium mb-0.5 text-gray-700 dark:text-gray-300">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-0.5 text-gray-700 dark:text-gray-300">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-0.5 text-gray-700 dark:text-gray-300">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-0.5 text-gray-700 dark:text-gray-300">Group Size</label>
                    <input
                      type="text"
                      value={formData.groupSize}
                      onChange={(e) => setFormData({ ...formData, groupSize: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-0.5 text-gray-700 dark:text-gray-300">Preferred Date</label>
                    <input
                      type="date"
                      value={formData.preferredDate}
                      onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-0.5 text-gray-700 dark:text-gray-300">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="quoted">Quoted</option>
                      <option value="booked">Booked</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-0.5 text-gray-700 dark:text-gray-300">Message</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={2}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Email</p>
                    <a href={`mailto:${lead.email}`} className="text-sm text-[var(--color-accent)] hover:underline break-all">
                      {lead.email}
                    </a>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Phone</p>
                    <a href={`tel:${lead.phone}`} className="text-sm text-[var(--color-accent)] hover:underline">
                      {lead.phone}
                    </a>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Group Size</p>
                    <p className="text-sm text-gray-900 dark:text-white">{lead.groupSize}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Preferred Date</p>
                    <p className="text-sm text-gray-900 dark:text-white">{formatDate(lead.preferredDate)}</p>
                  </div>
                </div>
                {lead.message && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Message</p>
                    <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap line-clamp-2">{lead.message}</p>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Created {formatDateTime(lead.createdAt)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Notes</h2>
              <button
                onClick={() => setShowNoteForm(!showNoteForm)}
                className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition"
              >
                {showNoteForm ? 'Cancel' : '+ Add'}
              </button>
            </div>
            {showNoteForm && (
              <div className="mb-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={2}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-1.5"
                />
                <button
                  onClick={handleAddNote}
                  className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition"
                >
                  Save
                </button>
              </div>
            )}
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {lead.notes.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">No notes yet</p>
              ) : (
                lead.notes.slice(0, 3).map((note) => (
                  <div key={note.id} className="p-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                    <p className="text-xs text-gray-900 dark:text-white whitespace-pre-wrap line-clamp-2">{note.content}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatDateTime(note.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Contacts Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Additional Contacts</h2>
              <button
                onClick={() => setShowContactForm(!showContactForm)}
                className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition"
              >
                {showContactForm ? 'Cancel' : '+ Add'}
              </button>
            </div>
            {showContactForm && (
              <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="Name *"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Role"
                    value={newContact.role}
                    onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <textarea
                    placeholder="Notes"
                    value={newContact.notes}
                    onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                    rows={1}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={handleAddContact}
                    className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition w-full"
                  >
                    Add Contact
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {lead.contacts.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">No additional contacts</p>
              ) : (
                lead.contacts.slice(0, 3).map((contact) => (
                  <div key={contact.id} className="p-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                    <p className="text-xs font-medium text-gray-900 dark:text-white">{contact.name}</p>
                    {contact.role && <p className="text-xs text-gray-600 dark:text-gray-400">{contact.role}</p>}
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="text-xs text-[var(--color-accent)] hover:underline block truncate">
                        {contact.email}
                      </a>
                    )}
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="text-xs text-[var(--color-accent)] hover:underline">
                        {contact.phone}
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={deleteConfirmation}
        onClose={() => setDeleteConfirmation(false)}
        onConfirm={handleDelete}
        title="Delete Lead"
        message="Are you sure you want to delete this lead? This action cannot be undone."
        confirmText="Delete"
        confirmColor="red"
      />
    </div>
  );
}


