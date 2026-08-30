import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import {
  ArrowLeft,
  Users,
  Smartphone,
  DownloadCloud,
  UserPlus,
  User,
  Mail,
  Phone,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User as UserType,
  BatchImportContact,
  normalizeToE164
} from '@shared/todo';
import { getDeviceContacts } from '../services/nativeContacts';
import { lightColors, darkColors } from '../theme/colors';
import { fontSizes } from '../theme/typography';

interface ContactsPageProps {
  onBack: () => void;
  users: UserType[];
  activeUser: UserType | null;
  setActiveUser: (user: UserType) => void;
  onAddUser: (user: { name: string; email: string; phone: string }) => Promise<boolean>;
  onUpdateUser: (user: { id: number; name: string; email: string; phone: string }) => Promise<boolean>;
  onDeleteUser: (userId: number) => void;
  onBatchImportUsers: (contacts: BatchImportContact[]) => Promise<any>;
  isDarkMode: boolean;
}

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const getAvatarBg = (name?: string) => {
  const avatarColors = ['#0078d4', '#10b981', '#742774', '#d83b01', '#0284c7', '#8b5cf6', '#ec4899', '#f59e0b'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = (name || '').charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const ContactCardRow = React.memo(({
  user: u,
  isActive,
  colors,
  isDarkMode,
  onSetActive,
  onEdit,
  onDelete
}: {
  user: UserType;
  isActive: boolean;
  colors: any;
  isDarkMode: boolean;
  onSetActive: (u: UserType) => void;
  onEdit: (u: UserType) => void;
  onDelete: (u: UserType) => void;
}) => {
  const bg = getAvatarBg(u.name);
  const initials = getInitials(u.name);

  return (
    <View
      style={[
        styles.contactCard,
        { backgroundColor: colors.card, borderColor: colors.border },
        isActive && {
          borderColor: '#0078d4',
          backgroundColor: isDarkMode ? '#1e293b' : '#eff6ff',
          borderWidth: 1.5
        }
      ]}
    >
      {u.avatar && u.avatar.startsWith('http') ? (
        <Image source={{ uri: u.avatar }} style={styles.contactAvatar} />
      ) : (
        <View style={[styles.avatarInitials, { backgroundColor: bg }]}>
          <Text style={styles.avatarInitialsText}>{initials}</Text>
        </View>
      )}

      <View style={styles.contactInfo}>
        <View style={styles.contactNameRow}>
          <Text style={[styles.contactName, { color: colors.text }]} numberOfLines={1}>
            {u.name}
          </Text>
          {isActive && (
            <View style={styles.youBadge}>
              <Text style={styles.youBadgeText}>YOU</Text>
            </View>
          )}
        </View>

        <View style={styles.contactMetaRow}>
          <Phone size={12} color="#25D366" />
          <Text style={[styles.contactPhone, { color: colors.textMuted }]} numberOfLines={1}>
            {u.phone}
          </Text>
        </View>

        {Boolean(u.email) && (
          <View style={styles.contactMetaRow}>
            <Mail size={12} color={colors.textMuted} />
            <Text style={[styles.contactEmail, { color: colors.textMuted }]} numberOfLines={1}>
              {u.email}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actionsWrap}>
        {!isActive && (
          <TouchableOpacity
            onPress={() => onSetActive(u)}
            style={[styles.switchBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.switchBtnText, { color: colors.text }]}>Switch</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => onEdit(u)}
          style={styles.iconBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Edit3 size={18} color="#0078d4" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onDelete(u)}
          style={styles.iconBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Trash2 size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function ContactsPage({
  onBack,
  users,
  activeUser,
  setActiveUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onBatchImportUsers,
  isDarkMode
}: ContactsPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const colors = isDarkMode ? darkColors : lightColors;
  const insets = useSafeAreaInsets();

  const handleStartEdit = useCallback((u: UserType) => {
    setEditingUserId(u.id);
    setName(u.name);
    setEmail(u.email || '');
    setPhone(u.phone || '');
    setIsFormOpen(true);
    setError('');
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingUserId(null);
    setName('');
    setEmail('');
    setPhone('');
    setIsFormOpen(false);
    setError('');
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Contact name is required.');
      return;
    }
    if (!phone.trim()) {
      setError('Phone number is required.');
      return;
    }

    const normalizedPhone = normalizeToE164(phone);
    if (!normalizedPhone) {
      setError('Invalid phone format. Please provide a valid mobile number (e.g. +919876543210).');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      if (editingUserId) {
        const ok = await onUpdateUser({
          id: editingUserId,
          name: name.trim(),
          email: email.trim(),
          phone: normalizedPhone
        });
        if (ok) {
          setSuccessMessage('Contact updated successfully.');
          handleCancelEdit();
          setTimeout(() => setSuccessMessage(''), 4000);
        } else {
          setError('Failed to update contact.');
        }
      } else {
        const ok = await onAddUser({
          name: name.trim(),
          email: email.trim(),
          phone: normalizedPhone
        });
        if (ok) {
          setSuccessMessage('Contact added successfully.');
          handleCancelEdit();
          setTimeout(() => setSuccessMessage(''), 4000);
        } else {
          setError('Failed to add contact.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Error saving contact.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = useCallback((u: UserType) => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete "${u.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDeleteUser(u.id);
            setSuccessMessage(`Deleted ${u.name}.`);
            setTimeout(() => setSuccessMessage(''), 4000);
          }
        }
      ]
    );
  }, [onDeleteUser]);

  const handleImportNativeContacts = async () => {
    setIsImporting(true);
    setError('');
    try {
      const result = await getDeviceContacts();
      if (!result.granted || result.contacts.length === 0) {
        setError(result.error || 'No contacts found on device or permission was denied.');
        return;
      }

      const res = await onBatchImportUsers(result.contacts);
      if (res && res.success) {
        const count = (res.importedCount || 0) + (res.updatedCount || 0);
        setSuccessMessage(`Successfully imported and synced ${count} device contact(s)!`);
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setError('Failed to sync device contacts to database.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Error importing native contacts.');
    } finally {
      setIsImporting(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim();
    if (!q) return users || [];
    return (users || []).filter((u) => u && (
      (u.name && typeof u.name === 'string' && u.name.toLowerCase().includes(q)) ||
      (u.phone && typeof u.phone === 'string' && u.phone.toLowerCase().includes(q)) ||
      (u.email && typeof u.email === 'string' && u.email.toLowerCase().includes(q))
    ));
  }, [users, searchQuery]);

  const renderContactItem = useCallback(({ item: u }: { item: UserType }) => {
    const isActive = activeUser?.id === u.id;
    return (
      <ContactCardRow
        user={u}
        isActive={isActive}
        colors={colors}
        isDarkMode={isDarkMode}
        onSetActive={setActiveUser}
        onEdit={handleStartEdit}
        onDelete={handleDelete}
      />
    );
  }, [activeUser?.id, colors, isDarkMode, setActiveUser, handleStartEdit, handleDelete]);

  const renderHeaderComponent = useMemo(() => (
    <View style={{ gap: 12, marginBottom: 12 }}>
      {/* Feedback Banners */}
      {Boolean(error) && (
        <View
          style={[
            styles.feedbackBanner,
            { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }
          ]}
        >
          <AlertCircle size={18} color="#ef4444" />
          <Text style={[styles.feedbackText, { color: '#ef4444' }]}>{error}</Text>
        </View>
      )}

      {Boolean(successMessage) && (
        <View
          style={[
            styles.feedbackBanner,
            { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }
          ]}
        >
          <CheckCircle2 size={18} color="#10b981" />
          <Text style={[styles.feedbackText, { color: '#10b981' }]}>
            {successMessage}
          </Text>
        </View>
      )}

      {/* Add / Edit Contact Form Card */}
      {isFormOpen && (
        <View
          style={[
            styles.formCard,
            { backgroundColor: colors.card, borderColor: '#0078d4' }
          ]}
        >
          <Text style={[styles.formTitle, { color: colors.text }]}>
            {editingUserId ? 'Edit Contact' : 'Add New Contact'}
          </Text>

          <View style={styles.inputWrap}>
            <User size={16} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              placeholder="Full Name (e.g., Sarah Jenkins)"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            />
          </View>

          <View style={styles.inputWrap}>
            <Phone size={16} color="#25D366" style={styles.inputIcon} />
            <TextInput
              placeholder="Phone (e.g., +919876543210)"
              placeholderTextColor={colors.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            />
          </View>

          <View style={styles.inputWrap}>
            <Mail size={16} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              placeholder="Email (Optional)"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            />
          </View>

          <View style={styles.formActionsRow}>
            <TouchableOpacity
              onPress={handleCancelEdit}
              style={[styles.cancelBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              style={styles.saveBtn}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {editingUserId ? 'Update Contact' : 'Save Contact'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Device Contacts Auto-Import Banner */}
      <View
        style={[
          styles.importCard,
          {
            backgroundColor: isDarkMode ? '#1e293b' : '#eff6ff',
            borderColor: isDarkMode ? '#334155' : '#bfdbfe'
          }
        ]}
      >
        <View style={styles.importTopRow}>
          <View style={styles.importTitleRow}>
            <Smartphone size={20} color="#0078d4" />
            <Text style={[styles.importTitle, { color: colors.text }]}>
              Device Contacts Auto-Import
            </Text>
          </View>
          <View style={styles.nativeBadge}>
            <Text style={styles.nativeBadgeText}>EXPO READY</Text>
          </View>
        </View>
        <Text style={[styles.importSubtitle, { color: colors.textMuted }]}>
          Sync your phone address book directly into Kamdhenu ToDo for task assignments and WhatsApp sharing.
        </Text>
        <TouchableOpacity
          onPress={handleImportNativeContacts}
          disabled={isImporting}
          style={styles.importBtn}
          activeOpacity={0.85}
        >
          {isImporting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <DownloadCloud size={18} color="#ffffff" />
              <Text style={styles.importBtnText}>
                Import & Sync Device Contacts
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Active User Switcher Card */}
      {activeUser && (
        <View
          style={[
            styles.activeUserCard,
            { backgroundColor: colors.card, borderColor: colors.border }
          ]}
        >
          <View style={[styles.avatarInitials, { backgroundColor: getAvatarBg(activeUser.name) }]}>
            <Text style={styles.avatarInitialsText}>{getInitials(activeUser.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.activeUserName, { color: colors.text }]}>
                {activeUser.name}
              </Text>
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>ACTIVE PROFILE</Text>
              </View>
            </View>
            <Text style={[styles.activeUserSub, { color: colors.textMuted }]}>
              Tasks assigned to this profile show in "Assigned to me".
            </Text>
          </View>
        </View>
      )}

      {/* Search Input Bar */}
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.card, borderColor: colors.border }
        ]}
      >
        <Search size={18} color={colors.textMuted} />
        <TextInput
          placeholder="Search contacts by name, phone, or email..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { color: colors.text }]}
        />
      </View>

      {/* Directory Counter Header */}
      <View style={styles.directoryHeaderRow}>
        <Text style={styles.directoryHeaderText}>
          DIRECTORY ({filteredUsers.length})
        </Text>
      </View>
    </View>
  ), [
    error,
    successMessage,
    isFormOpen,
    editingUserId,
    colors,
    name,
    phone,
    email,
    isSaving,
    isDarkMode,
    isImporting,
    activeUser,
    searchQuery,
    filteredUsers.length,
    handleCancelEdit,
    handleSave,
    handleImportNativeContacts
  ]);

  const renderEmptyComponent = useMemo(() => (
    <View
      style={[
        styles.emptyWrap,
        { backgroundColor: colors.card, borderColor: colors.border }
      ]}
    >
      <View
        style={[
          styles.emptyIconWrap,
          { backgroundColor: isDarkMode ? '#27272a' : '#e2e8f0' }
        ]}
      >
        <Users size={32} color={colors.textMuted} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No contacts found
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
        {searchQuery
          ? `No contacts match "${searchQuery}".`
          : 'Import device contacts above or tap Add to add your first contact.'}
      </Text>
    </View>
  ), [colors, isDarkMode, searchQuery]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 14) + 6 }
      ]}
    >
      {/* Header Banner */}
      <View
        style={[
          styles.header,
          { borderBottomColor: colors.border, backgroundColor: colors.card }
        ]}
      >
        <TouchableOpacity
          onPress={onBack}
          style={[
            styles.backButton,
            { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', borderColor: colors.border }
          ]}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTextWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Contacts Directory
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            {users.length} saved contact{users.length === 1 ? '' : 's'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            if (isFormOpen && !editingUserId) {
              setIsFormOpen(false);
            } else {
              handleCancelEdit();
              setIsFormOpen(true);
            }
          }}
          style={styles.addContactHeaderBtn}
          activeOpacity={0.8}
        >
          <UserPlus size={18} color="#ffffff" />
          <Text style={styles.addContactHeaderBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Virtualized Contact List */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
      >
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderContactItem}
          ListHeaderComponent={renderHeaderComponent}
          ListEmptyComponent={renderEmptyComponent}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 40 }
          ]}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={15}
          updateCellsBatchingPeriod={30}
          removeClippedSubviews={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1
  },
  headerTextWrap: {
    flex: 1
  },
  headerTitle: {
    fontSize: fontSizes.medium,
    fontWeight: '800'
  },
  headerSubtitle: {
    fontSize: fontSizes.caption
  },
  addContactHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0078d4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12
  },
  addContactHeaderBtnText: {
    color: '#ffffff',
    fontSize: fontSizes.small,
    fontWeight: '700'
  },
  scrollContent: {
    padding: 16,
    gap: 8
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1
  },
  feedbackText: {
    fontSize: fontSizes.small,
    fontWeight: '600',
    flex: 1
  },
  formCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 10
  },
  formTitle: {
    fontSize: fontSizes.small,
    fontWeight: '800'
  },
  inputWrap: {
    position: 'relative'
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    top: 14,
    zIndex: 1
  },
  formInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 38,
    paddingRight: 12,
    fontSize: fontSizes.small,
    fontWeight: '500'
  },
  formActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1
  },
  cancelBtnText: {
    fontSize: fontSizes.caption,
    fontWeight: '600'
  },
  saveBtn: {
    backgroundColor: '#0078d4',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: fontSizes.caption,
    fontWeight: '700'
  },
  importCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8
  },
  importTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  importTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  importTitle: {
    fontSize: fontSizes.small,
    fontWeight: '800'
  },
  nativeBadge: {
    backgroundColor: 'rgba(0, 120, 212, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8
  },
  nativeBadgeText: {
    color: '#0078d4',
    fontSize: fontSizes.caption,
    fontWeight: '800'
  },
  importSubtitle: {
    fontSize: fontSizes.caption,
    lineHeight: 16
  },
  importBtn: {
    backgroundColor: '#0078d4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 42,
    borderRadius: 12,
    marginTop: 4
  },
  importBtnText: {
    color: '#ffffff',
    fontSize: fontSizes.small,
    fontWeight: '700'
  },
  activeUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1
  },
  activeUserName: {
    fontSize: fontSizes.small,
    fontWeight: '800'
  },
  activeUserSub: {
    fontSize: fontSizes.caption,
    marginTop: 2
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizes.small,
    fontWeight: '500'
  },
  directoryHeaderRow: {
    marginTop: 4,
    marginBottom: 2
  },
  directoryHeaderText: {
    fontSize: fontSizes.caption,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14
  },
  avatarInitials: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarInitialsText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800'
  },
  contactInfo: {
    flex: 1,
    gap: 2
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  contactName: {
    fontSize: fontSizes.small,
    fontWeight: '800'
  },
  youBadge: {
    backgroundColor: 'rgba(0, 120, 212, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  youBadgeText: {
    color: '#0078d4',
    fontSize: fontSizes.caption,
    fontWeight: '800'
  },
  contactMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  contactPhone: {
    fontSize: fontSizes.caption,
    fontWeight: '600'
  },
  contactEmail: {
    fontSize: fontSizes.caption
  },
  actionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  switchBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center'
  },
  switchBtnText: {
    fontSize: fontSizes.caption,
    fontWeight: '700'
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyWrap: {
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  emptyTitle: {
    fontSize: fontSizes.small,
    fontWeight: '800'
  },
  emptySubtitle: {
    fontSize: fontSizes.caption,
    textAlign: 'center',
    marginTop: 4
  }
});
