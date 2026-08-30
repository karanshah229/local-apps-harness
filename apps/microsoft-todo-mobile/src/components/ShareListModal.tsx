import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  StyleSheet
} from 'react-native';
import { Share2, Trash2, X, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, List } from '@shared/todo';
import { lightColors, darkColors } from '../theme/colors';
import { fontSizes } from '../theme/typography';

interface ShareListModalProps {
  isOpen: boolean;
  onClose: () => void;
  list: List | null;
  users: User[];
  onShareList: (listId: number, userId: number) => void;
  onRemoveShare: (listId: number, userId: number) => void;
  isDarkMode: boolean;
}

export default function ShareListModal({
  isOpen,
  onClose,
  list,
  users,
  onShareList,
  onRemoveShare,
  isDarkMode
}: ShareListModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const colors = isDarkMode ? darkColors : lightColors;
  const insets = useSafeAreaInsets();

  if (!list) return null;

  const members = list.members || [];
  const memberIds = members.map((m) => m.id);
  const availableUsers = users.filter(
    (u) => u.id !== list.created_by && !memberIds.includes(u.id)
  );

  const handleAddMember = () => {
    if (!selectedUserId) return;
    onShareList(list.id, selectedUserId);
    setSelectedUserId(null);
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
              <Share2 size={20} color="#0078d4" />
              <View>
                <Text style={[styles.title, { color: colors.text }]}>
                  Share "{list.title}"
                </Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  Shared members receive real-time sync updates
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
          >
            {/* Add Member from Contacts Section */}
            <Text style={styles.sectionHeader}>ADD MEMBER FROM CONTACTS</Text>

            {availableUsers.length > 0 ? (
              <View style={styles.userPickerRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.pillRow}>
                    {availableUsers.map((u) => {
                      const isPicked = selectedUserId === u.id;
                      return (
                        <TouchableOpacity
                          key={u.id}
                          onPress={() => setSelectedUserId(isPicked ? null : u.id)}
                          style={[
                            styles.userPickPill,
                            {
                              backgroundColor: isPicked
                                ? 'rgba(0, 120, 212, 0.12)'
                                : isDarkMode
                                ? '#27272a'
                                : '#f8fafc',
                              borderColor: isPicked ? '#0078d4' : colors.border
                            }
                          ]}
                          activeOpacity={0.7}
                        >
                          <Image
                            source={{
                              uri:
                                u.avatar ||
                                `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(u.name)}`
                            }}
                            style={styles.userPickAvatar}
                          />
                          <Text
                            style={[
                              styles.userPickName,
                              { color: isPicked ? '#0078d4' : colors.text }
                            ]}
                          >
                            {u.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                <TouchableOpacity
                  onPress={handleAddMember}
                  disabled={!selectedUserId}
                  style={[
                    styles.addMemberBtn,
                    !selectedUserId && { opacity: 0.5 }
                  ]}
                  activeOpacity={0.8}
                >
                  <Plus size={16} color="#ffffff" />
                  <Text style={styles.addMemberBtnText}>Add Member</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={[
                  styles.emptyUsersBox,
                  { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc' }
                ]}
              >
                <Text style={[styles.emptyUsersText, { color: colors.textMuted }]}>
                  All available library contacts are already members of this list.
                </Text>
              </View>
            )}

            {/* Active Members Section */}
            <Text style={styles.sectionHeader}>
              ACTIVE LIST MEMBERS ({members.length})
            </Text>

            {members.length === 0 ? (
              <View
                style={[
                  styles.emptyMembersBox,
                  { borderColor: colors.border }
                ]}
              >
                <Text
                  style={[styles.emptyMembersText, { color: colors.textMuted }]}
                >
                  This list is not shared with anyone yet. Select a contact above to share!
                </Text>
              </View>
            ) : (
              <View style={styles.membersList}>
                {members.map((m) => (
                  <View
                    key={m.id}
                    style={[
                      styles.memberCard,
                      { backgroundColor: colors.card, borderColor: colors.border }
                    ]}
                  >
                    <Image
                      source={{
                        uri:
                          m.avatar ||
                          `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(m.name)}`
                      }}
                      style={styles.memberAvatar}
                    />
                    <View style={styles.memberInfo}>
                      <Text style={[styles.memberName, { color: colors.text }]}>
                        {m.name}
                      </Text>
                      <Text
                        style={[styles.memberPhone, { color: colors.textMuted }]}
                      >
                        {m.phone}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => onRemoveShare(list.id, m.id)}
                      style={styles.removeBtn}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
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
    justifyContent: 'flex-end'
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    maxHeight: '80%',
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
    padding: 6
  },
  scrollArea: {
    paddingHorizontal: 16,
    paddingTop: 12
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 24
  },
  sectionHeader: {
    fontSize: fontSizes.caption,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
    marginTop: 6
  },
  userPickerRow: {
    gap: 10
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4
  },
  userPickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1
  },
  userPickAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12
  },
  userPickName: {
    fontSize: fontSizes.caption,
    fontWeight: '700'
  },
  addMemberBtn: {
    backgroundColor: '#0078d4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 14
  },
  addMemberBtnText: {
    color: '#ffffff',
    fontSize: fontSizes.small,
    fontWeight: '800'
  },
  emptyUsersBox: {
    padding: 12,
    borderRadius: 14,
    alignItems: 'center'
  },
  emptyUsersText: {
    fontSize: fontSizes.caption,
    textAlign: 'center'
  },
  emptyMembersBox: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center'
  },
  emptyMembersText: {
    fontSize: fontSizes.caption,
    textAlign: 'center',
    lineHeight: 16
  },
  membersList: {
    gap: 6
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 16,
    borderWidth: 1
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10
  },
  memberInfo: {
    flex: 1
  },
  memberName: {
    fontSize: fontSizes.small,
    fontWeight: '700'
  },
  memberPhone: {
    fontSize: fontSizes.caption,
    marginTop: 1
  },
  removeBtn: {
    padding: 6
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
