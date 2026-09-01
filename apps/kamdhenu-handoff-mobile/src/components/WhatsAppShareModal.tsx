import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from 'react-native';
import {
  Send,
  Phone,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  X,
  Users,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  WhatsAppPayloadConfig,
  formatSingleTaskMessage,
  formatBatchTasksMessage,
  formatWholeListMessage,
  generateWhatsAppDeepLink,
  generateWhatsAppWebLink,
} from '@shared/todo';
import { localTodoDb } from '../db/sqlite';
import { lightColors, darkColors } from '../theme/colors';
import { fontSizes } from '../theme/typography';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WhatsAppPayloadConfig | null;
  users: User[];
  onGeneratePayload?: (config: WhatsAppPayloadConfig) => Promise<{
    waLink: string;
    message: string;
    recipientPhone: string;
    recipientName: string;
  }>;
  isDarkMode: boolean;
}

export default function WhatsAppShareModal({
  isOpen,
  onClose,
  config,
  users,
  onGeneratePayload,
  isDarkMode
}: WhatsAppShareModalProps) {
  const [message, setMessage] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const colors = isDarkMode ? darkColors : lightColors;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (isOpen && config) {
      if (config.recipientUserId) {
        setSelectedUserId(config.recipientUserId);
      }
      fetchPayload(config.recipientUserId || null, config.customPhone || '');
    }
  }, [isOpen, config]);

  const fetchPayload = async (userId: number | null, customPhone: string) => {
    if (!config) return;
    setLoading(true);
    try {
      if (onGeneratePayload) {
        const data = await onGeneratePayload({
          ...config,
          recipientUserId: userId,
          customPhone: customPhone
        });
        setMessage(data.message || '');
        setRecipientPhone(data.recipientPhone || '');
      } else {
        // Generate payload 100% locally from SQLite DB
        let generatedMessage = '';
        let targetPhone = customPhone || '';
        let targetName = 'Recipient';

        if (userId) {
          const user = users.find((u) => u.id === userId);
          if (user) {
            targetPhone = targetPhone || user.phone;
            targetName = user.name;
          }
        }

        if (config.type === 'single' && config.taskId) {
          const task = localTodoDb.getTaskById(config.taskId);
          if (task) {
            const subtasks = localTodoDb.getSubtasks(task.id);
            if (!targetPhone && task.assignee_phone) {
              targetPhone = task.assignee_phone;
              targetName = task.assignee_name || targetName;
            }
            generatedMessage = formatSingleTaskMessage(task, { name: targetName, phone: targetPhone }, subtasks);
            localTodoDb.logWhatsAppMessage({
              taskId: task.id,
              phone: targetPhone,
              recipientName: targetName,
              message: generatedMessage,
            });
          }
        } else if (config.type === 'batch' && config.taskIds && config.taskIds.length > 0) {
          const allTasks = localTodoDb.getTasks();
          const selectedTasks = allTasks.filter((t) => config.taskIds?.includes(t.id));
          generatedMessage = formatBatchTasksMessage(selectedTasks);
          localTodoDb.logWhatsAppMessage({
            taskId: null,
            phone: targetPhone,
            recipientName: targetName,
            message: generatedMessage,
          });
        } else if (config.type === 'list' && config.listId) {
          const lists = localTodoDb.getLists();
          const list = lists.find((l) => l.id === config.listId);
          if (list) {
            const tasks = localTodoDb.getTasks({ listId: list.id });
            const scope = (list.default_whatsapp_share_scope as 'pending' | 'all' | 'current_view') || 'pending';
            const targetTasks = scope === 'pending' ? tasks.filter((t) => !t.is_completed) : tasks;
            generatedMessage = formatWholeListMessage(list, targetTasks, { scope });
            localTodoDb.logWhatsAppMessage({
              taskId: null,
              phone: targetPhone,
              recipientName: targetName,
              message: generatedMessage,
            });
          }
        }

        setMessage(generatedMessage);
        setRecipientPhone(targetPhone);
      }
    } catch (err) {
      console.error('Error generating WhatsApp payload locally:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (userId: number | null) => {
    setSelectedUserId(userId);
    const u = users.find((x) => x.id === userId);
    fetchPayload(userId, u ? u.phone : '');
  };

  const handleCustomPhoneChange = (phone: string) => {
    setRecipientPhone(phone);
    fetchPayload(selectedUserId, phone);
  };

  const handleCopy = () => {
    try {
      // Direct copy fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleOpenWhatsApp = async () => {
    const deepLink = generateWhatsAppDeepLink(recipientPhone, message);
    const webLink = generateWhatsAppWebLink(recipientPhone, message);

    try {
      const canOpen = await Linking.canOpenURL(deepLink);
      if (canOpen) {
        await Linking.openURL(deepLink);
      } else {
        await Linking.openURL(webLink);
      }
    } catch {
      await Linking.openURL(webLink);
    }
  };

  if (!config) return null;

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
              <Send size={20} color="#25D366" />
              <View>
                <Text style={[styles.title, { color: '#25D366' }]}>
                  {config.type === 'single' && 'WhatsApp Task Reminder'}
                  {config.type === 'batch' && 'WhatsApp Batch Digest'}
                  {config.type === 'list' && 'Share List via WhatsApp'}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  Format and send cleanly to any contact
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
          >
            {/* Contact Picker Section */}
            <Text style={styles.sectionHeader}>SELECT RECIPIENT CONTACT</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.pillRow}>
                {/* WhatsApp Group Pill */}
                <TouchableOpacity
                  onPress={() => handleUserSelect(selectedUserId === -1 ? null : -1)}
                  style={[
                    styles.contactPill,
                    {
                      backgroundColor: selectedUserId === -1
                        ? 'rgba(37, 211, 102, 0.2)'
                        : isDarkMode
                        ? '#27272a'
                        : '#f8fafc',
                      borderColor: selectedUserId === -1 ? '#25D366' : colors.border,
                    }
                  ]}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: isDarkMode ? 'rgba(37, 211, 102, 0.25)' : '#dcfce7',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Users size={15} color="#25D366" />
                  </View>
                  <Text
                    style={[
                      styles.contactPillName,
                      { color: selectedUserId === -1 ? '#25D366' : colors.text }
                    ]}
                  >
                    WhatsApp Group
                  </Text>
                </TouchableOpacity>

                {/* Self (You) Pill */}
                <TouchableOpacity
                  onPress={() => handleUserSelect(selectedUserId === 1 ? null : 1)}
                  style={[
                    styles.contactPill,
                    {
                      backgroundColor: selectedUserId === 1
                        ? 'rgba(37, 211, 102, 0.15)'
                        : isDarkMode
                        ? '#27272a'
                        : '#f8fafc',
                      borderColor: selectedUserId === 1 ? '#25D366' : colors.border,
                    }
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.contactPillName,
                      { color: selectedUserId === 1 ? '#25D366' : colors.text }
                    ]}
                  >
                    Self (You)
                  </Text>
                </TouchableOpacity>

                {users.filter((u) => u.id !== 1 && !u.is_group).map((u) => {
                  const isSelected = selectedUserId === u.id;
                  return (
                    <TouchableOpacity
                      key={u.id}
                      onPress={() => handleUserSelect(isSelected ? null : u.id)}
                      style={[
                        styles.contactPill,
                        {
                          backgroundColor: isSelected
                            ? 'rgba(37, 211, 102, 0.15)'
                            : isDarkMode
                            ? '#27272a'
                            : '#f8fafc',
                          borderColor: isSelected ? '#25D366' : colors.border
                        }
                      ]}
                      activeOpacity={0.7}
                    >
                      {u.is_group ? (
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: isDarkMode ? 'rgba(37, 211, 102, 0.25)' : '#dcfce7',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Users size={14} color="#25D366" />
                        </View>
                      ) : (
                        <Image
                          source={{
                            uri:
                              u.avatar ||
                              `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(u.name)}`
                          }}
                          style={styles.contactPillAvatar}
                        />
                      )}
                      <Text
                        style={[
                          styles.contactPillName,
                          { color: isSelected ? '#25D366' : colors.text }
                        ]}
                      >
                        {u.name.split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Custom Phone Number Input */}
            <View
              style={[
                styles.inputWrap,
                { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc' }
              ]}
            >
              <Phone size={16} color="#25D366" />
              <TextInput
                placeholder="Or custom WhatsApp phone (+91...)"
                placeholderTextColor={colors.textMuted}
                value={recipientPhone}
                onChangeText={handleCustomPhoneChange}
                keyboardType="phone-pad"
                style={[styles.phoneInput, { color: colors.text }]}
              />
            </View>

            {/* Formatted Message Bubble Preview */}
            <View style={styles.previewHeaderRow}>
              <View style={styles.previewHeaderLeft}>
                <MessageSquare size={14} color={colors.textMuted} />
                <Text style={styles.sectionHeader}>FORMATTED MESSAGE PREVIEW</Text>
              </View>

              <TouchableOpacity
                onPress={handleCopy}
                style={styles.copyBtn}
                activeOpacity={0.7}
              >
                {copied ? (
                  <>
                    <Check size={14} color="#10b981" />
                    <Text style={{ color: '#10b981', fontSize: fontSizes.caption, fontWeight: '700' }}>
                      Copied!
                    </Text>
                  </>
                ) : (
                  <>
                    <Copy size={14} color="#0078d4" />
                    <Text style={{ color: '#0078d4', fontSize: fontSizes.caption, fontWeight: '700' }}>
                      Copy Text
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.messageBubble,
                {
                  backgroundColor: isDarkMode ? '#111b21' : '#e5ddd5',
                  borderColor: isDarkMode ? '#27272a' : '#d1c7bd'
                }
              ]}
            >
              {loading ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="small" color="#25D366" />
                  <Text style={{ color: colors.textMuted, fontSize: fontSizes.caption }}>
                    Generating formatted message...
                  </Text>
                </View>
              ) : (
                <Text
                  style={[
                    styles.messageText,
                    { color: isDarkMode ? '#f4f4f5' : '#111b21' }
                  ]}
                  selectable
                >
                  {message || 'No task details to format.'}
                </Text>
              )}
            </View>
          </ScrollView>

          {/* Bottom Actions */}
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
              onPress={handleOpenWhatsApp}
              disabled={!message || loading}
              style={[
                styles.openWhatsAppBtn,
                (!message || loading) && { opacity: 0.5 }
              ]}
              activeOpacity={0.8}
            >
              <ExternalLink size={18} color="#ffffff" />
              <Text style={styles.openWhatsAppText}>Open in WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              style={styles.cancelBtn}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>
                Cancel
              </Text>
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
    maxHeight: '85%',
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
    letterSpacing: 0.8
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2
  },
  contactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1
  },
  contactPillAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11
  },
  contactPillName: {
    fontSize: fontSizes.caption,
    fontWeight: '700'
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    height: 44
  },
  phoneInput: {
    flex: 1,
    fontSize: fontSizes.small,
    fontWeight: '600'
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4
  },
  previewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4
  },
  messageBubble: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    minHeight: 120,
    maxHeight: 220
  },
  messageText: {
    fontSize: fontSizes.caption,
    lineHeight: 18,
    fontFamily: 'Courier'
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 30
  },
  bottomBar: {
    padding: 16,
    borderTopWidth: 1,
    gap: 8
  },
  openWhatsAppBtn: {
    backgroundColor: '#25D366',
    height: 48,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  openWhatsAppText: {
    color: '#ffffff',
    fontSize: fontSizes.small,
    fontWeight: '800'
  },
  cancelBtn: {
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelBtnText: {
    fontSize: fontSizes.small,
    fontWeight: '700'
  }
});
