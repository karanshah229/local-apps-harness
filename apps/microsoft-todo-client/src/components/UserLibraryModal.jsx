import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from './ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  UserPlus,
  Phone,
  Mail,
  User,
  Edit3,
  Trash2,
  Check,
  Users,
  ShieldCheck,
  Smartphone,
  Info,
  Sparkles,
  DownloadCloud,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function UserLibraryModal({
  isOpen,
  onClose,
  users,
  activeUser,
  setActiveUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onBatchImportUsers
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [editingUserId, setEditingUserId] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Check if Web Contact Picker API is supported in the current environment
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

    if (editingUserId) {
      const success = await onUpdateUser({
        id: editingUserId,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim()
      });
      if (success) {
        handleCancelEdit();
      } else {
        setError('Failed to update contact.');
      }
    } else {
      const success = await onAddUser({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim()
      });
      if (success) {
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
    }
  };

  // Mobile Contacts API Import Handler
  const handleImportMobileContacts = async () => {
    if (!isContactsSupported) return;
    setError('');
    setSuccessMessage('');
    setIsImporting(true);

    try {
      // Determine supported contact properties
      let props = ['name', 'email', 'tel'];
      if ('getProperties' in navigator.contacts) {
        try {
          const availableProps = await navigator.contacts.getProperties();
          props = props.filter((p) => availableProps.includes(p));
        } catch (propErr) {
          console.warn('Could not query getProperties:', propErr);
        }
      }

      // Open native system contacts picker with multiple selection
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

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="max-h-[92vh] rounded-t-3xl p-5 pt-3">
        <SheetHeader className="pb-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-lg font-bold">
            <Users className="w-5 h-5 text-primary" />
            <span>Contacts & Account Library</span>
          </SheetTitle>
          <SheetDescription className="text-xs">
            Switch active account, import device contacts, and manage WhatsApp task assignments.
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-4 max-h-[62vh] overflow-y-auto pr-1">
          {/* Active Account Switcher Card */}
          <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Active Current User
              </span>
              <span className="text-[11px] text-muted-foreground">Tap to switch</span>
            </div>

            <select
              value={activeUser?.id || ''}
              onChange={(e) => {
                const u = users.find((x) => x.id === parseInt(e.target.value));
                if (u && setActiveUser) setActiveUser(u);
              }}
              className="w-full h-11 px-3 rounded-xl bg-background border border-border text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  👤 {u.name} ({u.phone})
                </option>
              ))}
            </select>
          </div>

          {/* Feedback Banners */}
          {error && (
            <div className="bg-destructive/10 text-destructive text-xs font-semibold p-3 rounded-xl border border-destructive/20 flex items-center gap-2 animate-in fade-in-50">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 animate-in fade-in-50">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Mobile Contacts API Feature Box / Fallback Info Banner */}
          {isContactsSupported ? (
            <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-200 dark:border-blue-800/60 rounded-2xl p-4 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <Smartphone className="w-4 h-4" />
                  <span>Mobile Device Contacts API</span>
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  Available
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Directly select contacts from your mobile phone address book to save into your shared directory for task assignments and WhatsApp reminders.
              </p>
              <Button
                type="button"
                onClick={handleImportMobileContacts}
                disabled={isImporting}
                className="w-full h-11 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow"
              >
                {isImporting ? (
                  <>
                    <DownloadCloud className="w-4 h-4 animate-bounce" />
                    <span>Importing & Syncing...</span>
                  </>
                ) : (
                  <>
                    <DownloadCloud className="w-4 h-4" />
                    <span>Import from Device Contacts</span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="bg-muted/40 dark:bg-muted/20 border border-border rounded-2xl p-3.5 flex items-start gap-3">
              <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5">
                <Info className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span>Device Contacts Import Info</span>
                  <span className="text-[10px] text-muted-foreground font-normal bg-muted px-1.5 py-0.2 rounded">
                    Mobile API
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Native address book import is active when opening this app on supported mobile browsers (such as Google Chrome on Android). You can also manually add or edit contacts anytime below.
                </p>
              </div>
            </div>
          )}

          {/* Add / Edit Form Collapsible or Card */}
          {isFormOpen ? (
            <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-sm font-bold">
                  {editingUserId ? `Edit Contact: "${name}"` : 'Add New Contact'}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="h-8 text-xs text-muted-foreground"
                >
                  Cancel
                </Button>
              </div>

              <div className="space-y-2.5">
                <div className="relative">
                  <User className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
                  <Input
                    type="text"
                    placeholder="Full Name (e.g. Rahul Sharma)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9 h-11"
                  />
                </div>

                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 h-11"
                  />
                </div>

                <div className="relative">
                  <Phone className="w-4 h-4 text-[#25D366] absolute left-3 top-3.5" />
                  <Input
                    type="tel"
                    placeholder="WhatsApp Phone with country code (e.g. +919876543210)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-9 h-11"
                  />
                </div>

                <Button type="submit" size="lg" className="w-full h-11 font-semibold">
                  {editingUserId ? 'Save Contact Changes' : 'Save Contact to Library'}
                </Button>
              </div>
            </form>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full h-11 border-dashed gap-2 font-semibold shadow-sm"
              onClick={() => {
                handleCancelEdit();
                setIsFormOpen(true);
              }}
            >
              <UserPlus className="w-4 h-4 text-primary" />
              <span>Add Contact Manually</span>
            </Button>
          )}

          {/* Saved Contacts Directory List */}
          <div className="space-y-2 pt-1">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
              Saved Contacts Directory ({users.length})
            </div>

            <div className="space-y-2">
              {users.map((u) => {
                const isCurrentActive = activeUser && activeUser.id === u.id;
                return (
                  <div
                    key={u.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-2xl border transition-all min-h-[56px] shadow-sm',
                      isCurrentActive
                        ? 'bg-primary/10 border-primary'
                        : 'bg-card border-border hover:bg-muted/40'
                    )}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <img
                        src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name)}`}
                        alt={u.name}
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-border flex-shrink-0"
                      />
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold truncate">{u.name}</span>
                          {isCurrentActive && (
                            <span className="text-[10px] bg-primary text-primary-foreground font-bold px-1.5 py-0.5 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 truncate">
                          <span>{u.phone}</span>
                          <span>•</span>
                          <span className="truncate">{u.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(u)}
                        className="p-2 text-muted-foreground hover:text-primary rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                        aria-label={`Edit ${u.name}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(u)}
                        className="p-2 text-muted-foreground hover:text-destructive rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                        aria-label={`Delete ${u.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-border mt-2">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full h-11 font-semibold"
            onClick={onClose}
          >
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
