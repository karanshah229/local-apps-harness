import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Users,
  UserPlus,
  Phone,
  Mail,
  User,
  Edit3,
  Trash2,
  Check,
  Search,
  Smartphone,
  Info,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { normalizeToE164 } from '@shared/todo';
import { cn } from '../lib/utils';

const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const getAvatarBg = (name) => {
  const avatarColors = ['bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-orange-600', 'bg-sky-600', 'bg-violet-600', 'bg-pink-600', 'bg-amber-600'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = (name || '').charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const renderAvatar = (u) => {
  const avatarUrl = u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name || 'User')}`;
  const initials = getInitials(u.name);
  const bgClass = getAvatarBg(u.name);

  return (
    <div className="relative flex-shrink-0">
      <Avatar className="w-12 h-12 ring-2 ring-border/50">
        <AvatarImage
          src={avatarUrl}
          alt={u.name}
          loading="lazy"
          className="object-cover"
        />
        <AvatarFallback className={cn('text-xs text-white font-bold', bgClass)}>
          {initials}
        </AvatarFallback>
      </Avatar>
    </div>
  );
};

export default function ContactsPage({
  onBack,
  users = [],
  activeUser,
  setActiveUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onBatchImportUsers
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [editingUserId, setEditingUserId] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isContactsSupported, setIsContactsSupported] = useState(false);

  useEffect(() => {
    const supported =
      typeof navigator !== 'undefined' &&
      'contacts' in navigator &&
      'ContactsManager' in window &&
      typeof navigator.contacts.select === 'function';
    setIsContactsSupported(!!supported);
  }, []);

  const handleStartEdit = (u) => {
    setEditingUserId(u.id);
    setName(u.name);
    setEmail(u.email);
    setPhone(u.phone);
    setError('');
    setSuccessMessage('');
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setName('');
    setEmail('');
    setPhone('');
    setError('');
    setIsFormOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('Name, Email, and Phone number are required.');
      return;
    }

    const normalizedPhone = normalizeToE164(phone.trim()) || phone.trim();

    if (editingUserId) {
      const success = await onUpdateUser({
        id: editingUserId,
        name: name.trim(),
        email: email.trim(),
        phone: normalizedPhone
      });
      if (success) {
        setSuccessMessage(`Contact "${name.trim()}" updated successfully!`);
        setTimeout(() => setSuccessMessage(''), 4000);
        handleCancelEdit();
      } else {
        setError('Failed to update contact.');
      }
    } else {
      const success = await onAddUser({
        name: name.trim(),
        email: email.trim(),
        phone: normalizedPhone
      });
      if (success) {
        setSuccessMessage(`Contact "${name.trim()}" added to library!`);
        setTimeout(() => setSuccessMessage(''), 4000);
        setName('');
        setEmail('');
        setPhone('');
        setIsFormOpen(false);
      } else {
        setError('Failed to add user or email already exists.');
      }
    }
  };

  const handleDelete = (u) => {
    if (window.confirm(`Are you sure you want to delete contact "${u.name}" from your library?`)) {
      onDeleteUser(u.id);
      if (editingUserId === u.id) {
        handleCancelEdit();
      }
      setSuccessMessage(`Contact "${u.name}" deleted.`);
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  const handleImportMobileContacts = async () => {
    if (!isContactsSupported) return;
    setError('');
    setSuccessMessage('');
    setIsImporting(true);

    try {
      let props = ['name', 'email', 'tel'];
      if ('getProperties' in navigator.contacts) {
        try {
          const availableProps = await navigator.contacts.getProperties();
          props = props.filter((p) => availableProps.includes(p));
        } catch (propErr) {
          console.warn('Could not query getProperties:', propErr);
        }
      }

      const pickedContacts = await navigator.contacts.select(props, { multiple: true });

      if (pickedContacts && pickedContacts.length > 0) {
        const formatted = pickedContacts.map((c) => {
          const rawName = Array.isArray(c.name) ? c.name[0] : (c.name || '');
          const rawPhone = Array.isArray(c.tel) ? c.tel[0] : (c.tel || '');
          const rawEmail = Array.isArray(c.email) ? c.email[0] : (c.email || '');
          return {
            name: rawName,
            phone: rawPhone,
            email: rawEmail
          };
        });

        if (onBatchImportUsers) {
          const res = await onBatchImportUsers(formatted);
          if (res && res.success) {
            const count = (res.importedCount || 0) + (res.updatedCount || 0);
            setSuccessMessage(`Successfully imported and synced ${count} contact(s) to database!`);
            setTimeout(() => setSuccessMessage(''), 5000);
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Contact picker error:', err);
        setError('Unable to read device contacts: ' + (err.message || 'Permission denied or unsupported.'));
      }
    } finally {
      setIsImporting(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return users;
    return users.filter((u) => (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.phone && u.phone.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    ));
  }, [users, searchQuery]);

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Header Banner */}
      <div className="p-4 sm:p-6 bg-card border-b border-border shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-muted/60 hover:bg-muted text-foreground flex items-center justify-center border border-border/40 transition-all active:scale-95 flex-shrink-0"
              title="Back"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>

            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                  Contacts Directory
                </h1>
                <Badge variant="outline" className="font-bold text-xs">
                  {users.length} Contact{users.length === 1 ? '' : 's'}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
                Manage saved contacts for task assignments and WhatsApp sharing
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => {
              if (isFormOpen && !editingUserId) {
                setIsFormOpen(false);
              } else {
                handleCancelEdit();
                setIsFormOpen(true);
              }
            }}
            className="h-11 px-4 rounded-2xl font-bold gap-2 flex-shrink-0 shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Contact</span>
          </Button>
        </div>
      </div>

      {/* Main Content Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 max-w-5xl w-full mx-auto pb-24 md:pb-8">
        {/* Feedback Alerts */}
        {error && (
          <div className="bg-destructive/10 text-destructive text-xs font-semibold p-3.5 rounded-2xl border border-destructive/20 flex items-center gap-2.5 animate-in fade-in-50">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2.5 animate-in fade-in-50">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Add / Edit Contact Form Card */}
        {isFormOpen && (
          <form
            onSubmit={handleSubmit}
            className="bg-card border-2 border-primary/40 rounded-3xl p-5 sm:p-6 shadow-md space-y-4 animate-in fade-in-50 slide-in-from-top-2"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 font-bold text-base text-foreground">
                <UserPlus className="w-5 h-5 text-primary" />
                <span>{editingUserId ? `Edit Contact: ${name}` : 'Add New Contact'}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                className="h-8 text-xs text-muted-foreground rounded-xl"
              >
                Cancel
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
                  <Input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9 h-11 rounded-xl font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Phone (E.164 Format)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#25D366] absolute left-3 top-3.5" />
                  <Input
                    type="tel"
                    placeholder="+919876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-9 h-11 rounded-xl font-medium"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
                className="h-10 px-4 rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 rounded-xl text-xs font-bold shadow-sm"
              >
                {editingUserId ? 'Update Contact' : 'Save Contact'}
              </Button>
            </div>
          </form>
        )}

        {/* Mobile / Device Contacts API Import Box */}
        {isContactsSupported && (
          <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-200 dark:border-blue-800/60 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold text-sm sm:text-base">
                <Smartphone className="w-5 h-5" />
                <span>Device Contacts Auto-Import</span>
              </div>
              <span className="text-xs font-extrabold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                Native API Ready
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Select contacts from your device address book to instantly save and sync them into your directory for WhatsApp reminders and task assignments.
            </p>
            <Button
              type="button"
              onClick={handleImportMobileContacts}
              disabled={isImporting}
              className="h-11 px-5 rounded-2xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow"
            >
              {isImporting ? (
                <>
                  <DownloadCloud className="w-4 h-4 animate-bounce" />
                  <span>Importing & Syncing Contacts...</span>
                </>
              ) : (
                <>
                  <DownloadCloud className="w-4 h-4" />
                  <span>Select & Import from Device Contacts</span>
                </>
              )}
            </Button>
          </div>
        )}

        {/* Active User Switcher Card */}
        {activeUser && (
          <div className="bg-card border border-border rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src={activeUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(activeUser.name)}`}
                alt={activeUser.name}
                className="w-12 h-12 rounded-2xl object-cover ring-2 ring-primary/30 flex-shrink-0"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{activeUser.name}</span>
                  <Badge variant="default" className="text-xs uppercase font-extrabold">
                    Active Profile
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  Tasks assigned to this profile show in "Assigned to me".
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5" />
            <Input
              type="text"
              placeholder="Search contacts by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 rounded-2xl bg-card border-border font-medium text-sm"
            />
          </div>
        </div>

        {/* Contacts Directory Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Directory ({filteredUsers.length})
            </span>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="bg-card border border-border rounded-3xl p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-3xl bg-muted/50 flex items-center justify-center mb-3">
                <Users className="w-8 h-8 text-muted-foreground/60" />
              </div>
              <h3 className="text-base font-bold text-foreground">No contacts found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                {searchQuery
                  ? `No contacts match "${searchQuery}". Try a different name, phone, or email.`
                  : 'Add contacts above or import them to begin assigning tasks and sending WhatsApp updates.'}
              </p>
            </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredUsers.map((u) => {
                  const isActiveProfile = activeUser?.id === u.id;

                  return (
                    <div
                      key={u.id}
                      className={cn(
                        'flex items-center justify-between p-4 rounded-3xl border transition-all shadow-sm bg-card',
                        isActiveProfile
                          ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                          : 'border-border hover:bg-muted/40'
                      )}
                    >
                      {/* Left Contact Details */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {renderAvatar(u)}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground truncate">
                              {u.name}
                            </span>
                            {isActiveProfile && (
                              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0">
                                You
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 truncate">
                            <Phone className="w-3 h-3 text-[#25D366] flex-shrink-0" />
                            <span className="font-semibold">{u.phone}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate mt-0.5">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{u.email}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        {setActiveUser && !isActiveProfile && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveUser(u)}
                            className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground font-semibold rounded-xl"
                            title="Switch active profile to this contact"
                          >
                            Switch
                          </Button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleStartEdit(u)}
                          className="w-10 h-10 min-h-[44px] min-w-[44px] -m-1 flex items-center justify-center text-muted-foreground hover:text-primary rounded-xl transition-all touch-manipulation active:scale-95"
                          aria-label={`Edit ${u.name}`}
                          title="Edit Contact"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(u)}
                          className="w-10 h-10 min-h-[44px] min-w-[44px] -m-1 flex items-center justify-center text-muted-foreground hover:text-destructive rounded-xl transition-all touch-manipulation active:scale-95"
                          aria-label={`Delete ${u.name}`}
                          title="Delete Contact"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
          )}
        </div>
      </div>
    </main>
  );
}
