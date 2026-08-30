import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import {
  Users,
  ShieldCheck,
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
  X
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

interface UserLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserType[];
  activeUser: UserType | null;
  setActiveUser: (user: UserType) => void;
  onAddUser: (user: { name: string; email: string; phone: string }) => Promise<boolean>;
  onUpdateUser: (user: { id: number; name: string; email: string; phone: string }) => Promise<boolean>;
  onDeleteUser: (userId: number) => void;
  onBatchImportUsers: (contacts: BatchImportContact[]) => Promise<any>;
  isDarkMode: boolean;
}

export default function UserLibraryModal({
  isOpen,
  onClose,
  users,
  activeUser,
  setActiveUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onBatchImportUsers,
  isDarkMode
}: UserLibraryModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const insets = useSafeAreaInsets();

  const colors = isDarkMode ? darkColors : lightColors;

  const handleStartEdit = (u: UserType) => {
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

  const handleSubmit = async () => {
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
        handleCancelEdit();
        setSuccessMessage('Contact updated successfully!');
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
        handleCancelEdit();
        setSuccessMessage('Contact saved to library!');
      } else {
        setError('Failed to add user or email already exists.');
      }
    }
  };

  const handleDelete = (u: UserType) => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to remove "${u.name}" from your library?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDeleteUser(u.id);
            if (editingUserId === u.id) handleCancelEdit();
          }
        }
      ]
    );
  };

  // Native Device Contacts Import using expo-contacts
  const handleImportNativeContacts = async () => {
    setError('');
    setSuccessMessage('');
    setIsImporting(true);

    try {
      const res = await getDeviceContacts();
      if (!res.granted) {
        setError(res.error || 'Permission denied to access device contacts.');
        setIsImporting(false);
        return;
      }

      if (!res.contacts || res.contacts.length === 0) {
        setError('No contacts found on device.');
        setIsImporting(false);
        return;
      }

      const result = await onBatchImportUsers(res.contacts);
      if (result && result.success) {
        const count = (result.importedCount || 0) + (result.updatedCount || 0);
        setSuccessMessage(`Successfully imported ${count} contact(s) from phone address book!`);
      } else {
        setSuccessMessage(`Imported ${res.contacts.length} contact(s)!`);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to import device contacts.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheetContainer,
            { backgroundColor: colors.card, borderColor: colors.border }
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerTitleRow}>
              <Users size={22} color="#0078d4" />
              <View>
                <Text style={[styles.title, { color: colors.text }]}>
                  Contacts Directory
                </Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  Import device contacts & manage WhatsApp assignments
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={true}
          >
            {/* Error / Success Feedback Banners */}
            {Boolean(error) && (
              <View style={styles.errorBanner}>
                <AlertCircle size={16} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {Boolean(successMessage) && (
              <View style={styles.successBanner}>
                <CheckCircle2 size={16} color="#10b981" />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            )}

            {/* Native Device Contacts Feature Card */}
            <View
              style={[
                styles.nativeContactsCard,
                { borderColor: isDarkMode ? '#1e3a8a' : '#bfdbfe' }
              ]}
            >
              <View style={styles.nativeContactsHeader}>
                <View style={styles.nativeContactsTitleRow}>
                  <Smartphone size={16} color="#0078d4" />
                  <Text style={styles.nativeContactsTitle}>
                    Native Phone Contacts
                  </Text>
                </View>
                <View style={styles.availableTag}>
                  <Text style={styles.availableTagText}>NATIVE API</Text>
                </View>
              </View>
              <Text
                style={[styles.nativeContactsDesc, { color: colors.textMuted }]}
              >
                Access and import contacts directly from your iOS or Android device
                address book for task assignments and WhatsApp sharing.
              </Text>

              <TouchableOpacity
                onPress={handleImportNativeContacts}
                disabled={isImporting}
                style={styles.importBtn}
                activeOpacity={0.8}
              >
                {isImporting ? (
                  <>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.importBtnText}>
                      Importing Phone Contacts...
                    </Text>
                  </>
                ) : (
                  <>
                    <DownloadCloud size={18} color="#ffffff" />
                    <Text style={styles.importBtnText}>
                      Import from Device Contacts
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Add / Edit Form Collapsible Card */}
            {isFormOpen ? (
              <View
                style={[
                  styles.formCard,
                  { backgroundColor: colors.card, borderColor: colors.border }
                ]}
              >
                <View style={styles.formHeader}>
                  <Text style={[styles.formTitle, { color: colors.text }]}>
                    {editingUserId ? `Edit: ${name}` : 'Add New Contact'}
                  </Text>
                  <TouchableOpacity onPress={handleCancelEdit}>
                    <Text style={{ color: colors.textMuted, fontSize: fontSizes.caption }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.formInputs}>
                  <View
                    style={[
                      styles.inputWrap,
                      { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc' }
                    ]}
                  >
                    <User size={16} color={colors.textMuted} />
                    <TextInput
                      placeholder="Full Name (e.g. Rahul Sharma)"
                      placeholderTextColor={colors.textMuted}
                      value={name}
                      onChangeText={setName}
                      style={[styles.formTextInput, { color: colors.text }]}
                    />
                  </View>

                  <View
                    style={[
                      styles.inputWrap,
                      { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc' }
                    ]}
                  >
                    <Mail size={16} color={colors.textMuted} />
                    <TextInput
                      placeholder="Email Address"
                      placeholderTextColor={colors.textMuted}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={[styles.formTextInput, { color: colors.text }]}
                    />
                  </View>

                  <View
                    style={[
                      styles.inputWrap,
                      { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc' }
                    ]}
                  >
                    <Phone size={16} color="#25D366" />
                    <TextInput
                      placeholder="WhatsApp Phone (e.g. +919876543210)"
                      placeholderTextColor={colors.textMuted}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      style={[styles.formTextInput, { color: colors.text }]}
                    />
                  </View>

                  <TouchableOpacity
                    onPress={handleSubmit}
                    style={styles.saveContactBtn}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.saveContactBtnText}>
                      {editingUserId
                        ? 'Save Changes'
                        : 'Save Contact to Library'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setIsFormOpen(true)}
                style={[
                  styles.addManualBtn,
                  { borderColor: colors.border, backgroundColor: colors.card }
                ]}
                activeOpacity={0.7}
              >
                <UserPlus size={18} color="#0078d4" />
                <Text style={styles.addManualBtnText}>
                  Add Contact Manually
                </Text>
              </TouchableOpacity>
            )}

            {/* Saved Contacts Directory List */}
            <Text style={styles.sectionHeader}>
              SAVED CONTACTS DIRECTORY ({users.length})
            </Text>

            <View style={styles.contactsList}>
              {users.map((u) => {
                const isCurrentActive = activeUser?.id === u.id;
                return (
                  <View
                    key={u.id}
                    style={[
                      styles.contactCard,
                      { backgroundColor: colors.card, borderColor: colors.border }
                    ]}
                  >
                    <Image
                      source={{
                        uri:
                          u.avatar ||
                          `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(u.name)}`
                      }}
                      style={styles.contactAvatar}
                    />

                    <View style={styles.contactInfo}>
                      <View style={styles.contactNameRow}>
                        <Text
                          style={[styles.contactName, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {u.name}
                        </Text>
                      </View>
                      <Text
                        style={[styles.contactSub, { color: colors.textMuted }]}
                        numberOfLines={1}
                      >
                        {u.phone} • {u.email}
                      </Text>
                    </View>

                    <View style={styles.contactActions}>
                      <TouchableOpacity
                        onPress={() => handleStartEdit(u)}
                        style={styles.contactActionBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={`Edit ${u.name}`}
                      >
                        <Edit3 size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(u)}
                        style={styles.contactActionBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={`Delete ${u.name}`}
                      >
                        <Trash2 size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Bottom Bar */}
          <View
            style={[
              styles.bottomBar,
              {
                borderTopColor: colors.border,
                paddingBottom: Math.max(insets.bottom, 16)
              }
            ]}
          >
            <TouchableOpacity
              onPress={onClose}
              style={styles.doneBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 480,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1
  },
  title: {
    fontSize: fontSizes.heading,
    fontWeight: '800'
  },
  subtitle: {
    fontSize: fontSizes.caption,
    fontWeight: '500',
    marginTop: 1
  },
  closeBtn: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  scrollArea: {
    paddingHorizontal: 16,
    paddingTop: 12
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 120
  },
  activeUserCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12
  },
  activeUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  activeUserTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  activeUserTagText: {
    fontSize: fontSizes.caption,
    fontWeight: '800',
    color: '#0078d4',
    letterSpacing: 0.5
  },
  userPillRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2
  },
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1
  },
  userPillSelected: {
    borderWidth: 2
  },
  userPillAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10
  },
  userPillName: {
    fontSize: fontSizes.caption,
    fontWeight: '700'
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    padding: 10,
    borderRadius: 12
  },
  errorText: {
    color: '#ef4444',
    fontSize: fontSizes.caption,
    fontWeight: '600',
    flex: 1
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    padding: 10,
    borderRadius: 12
  },
  successText: {
    color: '#10b981',
    fontSize: fontSizes.caption,
    fontWeight: '600',
    flex: 1
  },
  nativeContactsCard: {
    backgroundColor: 'rgba(0, 120, 212, 0.06)',
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 8
  },
  nativeContactsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  nativeContactsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  nativeContactsTitle: {
    fontSize: fontSizes.small,
    fontWeight: '800',
    color: '#0078d4'
  },
  availableTag: {
    backgroundColor: 'rgba(0, 120, 212, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  availableTagText: {
    fontSize: fontSizes.caption,
    fontWeight: '900',
    color: '#0078d4'
  },
  nativeContactsDesc: {
    fontSize: fontSizes.caption,
    lineHeight: 16
  },
  importBtn: {
    backgroundColor: '#0078d4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 14,
    marginTop: 2
  },
  importBtnText: {
    color: '#ffffff',
    fontSize: fontSizes.small,
    fontWeight: '800'
  },
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 10
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  formTitle: {
    fontSize: fontSizes.small,
    fontWeight: '800'
  },
  formInputs: {
    gap: 8
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 44
  },
  formTextInput: {
    flex: 1,
    fontSize: fontSizes.small,
    fontWeight: '600'
  },
  saveContactBtn: {
    backgroundColor: '#0078d4',
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4
  },
  saveContactBtnText: {
    color: '#ffffff',
    fontSize: fontSizes.small,
    fontWeight: '800'
  },
  addManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed'
  },
  addManualBtnText: {
    color: '#0078d4',
    fontSize: fontSizes.small,
    fontWeight: '700'
  },
  sectionHeader: {
    fontSize: fontSizes.caption,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
    marginTop: 6
  },
  contactsList: {
    gap: 6
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 16,
    borderWidth: 1
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10
  },
  contactInfo: {
    flex: 1
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  contactName: {
    fontSize: fontSizes.small,
    fontWeight: '700'
  },
  youBadge: {
    backgroundColor: '#0078d4',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8
  },
  youBadgeText: {
    color: '#ffffff',
    fontSize: fontSizes.caption,
    fontWeight: '900'
  },
  contactSub: {
    fontSize: fontSizes.caption,
    marginTop: 1
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  contactActionBtn: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  bottomBar: {
    padding: 16,
    borderTopWidth: 1
  },
  doneBtn: {
    backgroundColor: '#0078d4',
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: fontSizes.small,
    fontWeight: '800'
  }
});
