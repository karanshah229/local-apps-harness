import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal
} from 'react-native';
import {
  Plus,
  Star,
  Check,
  CheckCircle2,
  Circle,
  CheckSquare,
  Square,
  Calendar,
  Clock,
  Send,
  ListTodo,
  ChevronDown,
  X
} from 'lucide-react-native';
import { Task, List, getThemePrimary } from '@shared/todo';
import { lightColors, darkColors } from '../theme/colors';
import { fontSizes } from '../theme/typography';

function hexToRgba(hex: string, alpha: number): string {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((char) => char + char).join('');
  }
  if (cleanHex.length !== 6) return `rgba(0, 120, 212, ${alpha})`;
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface TaskMainViewProps {
  activeView: string | null;
  activeList?: List | null;
  tasks: Task[];
  selectedTaskId?: number | null;
  onSelectTask: (task: Task) => void;
  onCreateTask: (taskData: { title: string; is_important?: number; list_id?: number | null }) => void;
  onOpenCreateTask?: () => void;
  onToggleTaskComplete: (task: Task) => void;
  onToggleTaskImportant: (task: Task) => void;
  onOpenWhatsAppModal: (config: any) => void;
  isMultiSelectMode: boolean;
  selectedTaskIds: number[];
  onToggleSelectTaskForBatch: (taskId: number) => void;
  onLongPressTask?: (taskId: number) => void;
  isDarkMode: boolean;
}

export default function TaskMainView({
  activeView,
  activeList,
  tasks,
  selectedTaskId,
  onSelectTask,
  onCreateTask,
  onOpenCreateTask,
  onToggleTaskComplete,
  onToggleTaskImportant,
  onOpenWhatsAppModal,
  isMultiSelectMode,
  selectedTaskIds,
  onToggleSelectTaskForBatch,
  onLongPressTask,
  isDarkMode
}: TaskMainViewProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const colors = isDarkMode ? darkColors : lightColors;

  const activeTasks = tasks.filter((t) => !t.is_completed);
  const completedTasks = tasks.filter((t) => Boolean(t.is_completed));
  const hasTaskMetadata = (task: Task) => Boolean(
    task.due_date ||
    (task.subtask_count && task.subtask_count > 0) ||
    task.assignee_name ||
    (task.lists && task.lists.length > 0)
  );

  const getHeaderTitle = () => {
    if (activeList) return activeList.title;
    switch (activeView) {
      case 'important':
        return 'Important';
      case 'assigned-to-me':
        return 'Assigned to me';
      case 'all-tasks':
      default:
        return 'All tasks';
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Batch Multi-Select Digest Bar */}
      {isMultiSelectMode && selectedTaskIds.length > 0 && (
        <View
          style={[
            styles.batchBar,
            {
              backgroundColor: isDarkMode ? '#0f172a' : '#1e293b',
              borderColor: isDarkMode ? '#334155' : '#334155'
            }
          ]}
        >
          <View style={styles.batchLeftWrap}>
            <View style={styles.batchIconWrap}>
              <CheckSquare size={16} color="#0078d4" />
            </View>
            <Text style={styles.batchText}>
              {selectedTaskIds.length} Task{selectedTaskIds.length > 1 ? 's' : ''} Selected
            </Text>
          </View>
          <TouchableOpacity
            onPress={() =>
              onOpenWhatsAppModal({
                type: 'batch',
                taskIds: selectedTaskIds
              })
            }
            style={styles.whatsappBatchBtn}
            activeOpacity={0.85}
          >
            <Send size={15} color="#ffffff" />
            <Text style={styles.whatsappBatchText}>
              Send WhatsApp ({selectedTaskIds.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tasks List */}
      <FlatList
        data={activeTasks}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={5}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={Platform.OS === 'android'}
        ListHeaderComponent={
          activeTasks.length === 0 && completedTasks.length > 0 ? (
            <View style={styles.allCompletedHeader}>
              <View
                style={[
                  styles.allCompletedIconWrap,
                  {
                    backgroundColor: isDarkMode
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(16, 185, 129, 0.1)'
                  }
                ]}
              >
                <CheckCircle2 size={24} color="#10b981" />
              </View>
              <Text style={[styles.allCompletedTitle, { color: colors.text }]}>
                All tasks completed!
              </Text>
              <Text
                style={[
                  styles.allCompletedSubtitle,
                  { color: colors.textMuted }
                ]}
              >
                Nice work! You're all caught up on this list.
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          completedTasks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View
                style={[
                  styles.emptyIconWrap,
                  { backgroundColor: isDarkMode ? '#27272a' : '#e2e8f0' }
                ]}
              >
                <ListTodo size={32} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No tasks here yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Stay organized by adding tasks above or assigning them from your lists.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const isSelected = selectedTaskId === item.id;
          const isBatchChecked = selectedTaskIds.includes(item.id);
          const isDone = Boolean(item.is_completed);
          const hasMetadata = hasTaskMetadata(item);

          return (
            <TouchableOpacity
              onPress={() => {
                if (isMultiSelectMode) {
                  onToggleSelectTaskForBatch(item.id);
                } else {
                  onSelectTask(item);
                }
              }}
              onLongPress={() => {
                if (onLongPressTask) {
                  onLongPressTask(item.id);
                } else {
                  onToggleSelectTaskForBatch(item.id);
                }
              }}
              delayLongPress={280}
              style={[
                styles.taskCard,
                !hasMetadata && styles.taskCardCompact,
                {
                  backgroundColor: colors.card,
                  borderColor: isSelected ? '#0078d4' : colors.border
                },
                isBatchChecked && {
                  backgroundColor: isDarkMode ? '#1e293b' : '#eff6ff',
                  borderColor: '#0078d4',
                  borderWidth: 1.5
                },
                isDone && styles.taskCardDone
              ]}
              activeOpacity={0.7}
            >
              {/* Left Action / Checkbox */}
              {isMultiSelectMode ? (
                <TouchableOpacity
                  onPress={() => onToggleSelectTaskForBatch(item.id)}
                  style={styles.checkTouchArea}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {isBatchChecked ? (
                    <CheckSquare size={20} color="#0078d4" />
                  ) : (
                    <View style={[styles.checkboxBox, { borderColor: colors.border }]} />
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => onToggleTaskComplete(item)}
                  style={styles.checkTouchArea}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {isDone ? (
                    <View style={[styles.checkboxBox, styles.checkboxBoxDone]}>
                      <Check size={12} color="#ffffff" strokeWidth={3} />
                    </View>
                  ) : (
                    <View style={[styles.checkboxBox, { borderColor: isDarkMode ? '#64748b' : '#94a3b8' }]} />
                  )}
                </TouchableOpacity>
              )}

              {/* Title & Metadata */}
              <View style={styles.taskInfo}>
                <Text
                  style={[
                    styles.taskTitle,
                    { color: colors.text },
                    isDone && [styles.taskTitleDone, { color: colors.textMuted }]
                  ]}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>

                {hasMetadata && <View style={styles.metadataRow}>
                  {Boolean(item.due_date) && (
                    <View style={styles.dateBadge}>
                      <Calendar size={11} color="#0078d4" />
                      <Text style={styles.dateText}>{item.due_date}</Text>
                    </View>
                  )}

                  {Boolean(item.subtask_count && item.subtask_count > 0) && (
                    <View
                      style={[
                        styles.chipBadge,
                        { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }
                      ]}
                    >
                      <Text
                        style={[styles.chipText, { color: colors.textMuted }]}
                      >
                        {item.subtask_completed_count || 0}/{item.subtask_count} steps
                      </Text>
                    </View>
                  )}

                  {Boolean(item.assignee_name) && (
                    <View
                      style={[
                        styles.assigneeBadge,
                        { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }
                      ]}
                    >
                      <Image
                        source={{
                          uri:
                            item.assignee_avatar ||
                            `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(item.assignee_name || '')}`
                        }}
                        style={styles.assigneeAvatar}
                      />
                      <Text
                        style={[styles.assigneeText, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {item.assignee_name?.split(' ')[0]}
                      </Text>
                    </View>
                  )}

                  {Boolean(item.lists && item.lists.length > 0) && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      {item.lists?.map((l) => {
                        const listColor = getThemePrimary(l.color_theme, isDarkMode);
                        return (
                          <View
                            key={l.id}
                            style={[
                              styles.chipBadge,
                              {
                                backgroundColor: hexToRgba(listColor, isDarkMode ? 0.2 : 0.12),
                                borderColor: hexToRgba(listColor, 0.3),
                                borderWidth: 1
                              }
                            ]}
                          >
                            <Text style={[styles.chipText, { color: listColor, fontWeight: '700' }]}>
                              {l.title}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>}
              </View>

              {/* Right Star Button */}
              <TouchableOpacity
                onPress={() => onToggleTaskImportant(item)}
                style={styles.starTouchArea}
                activeOpacity={0.7}
              >
                <Star
                  size={20}
                  color={item.is_important ? '#f59e0b' : colors.textMuted}
                  fill={item.is_important ? '#f59e0b' : 'transparent'}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          completedTasks.length > 0 ? (
            <View style={styles.completedContainer}>
              <TouchableOpacity
                onPress={() => setShowCompleted(!showCompleted)}
                style={styles.completedHeader}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <ChevronDown
                  size={16}
                  color={colors.textMuted}
                  style={{
                    transform: [{ rotate: showCompleted ? '180deg' : '0deg' }]
                  }}
                />
                <Text
                  style={[
                    styles.completedHeaderText,
                    { color: colors.textMuted }
                  ]}
                >
                  Completed ({completedTasks.length})
                </Text>
              </TouchableOpacity>

              {showCompleted && (
                <View style={styles.completedList}>
                  {completedTasks.map((item) => {
                    const isSelected = selectedTaskId === item.id;
                    const isBatchChecked = selectedTaskIds.includes(item.id);
                    const hasMetadata = hasTaskMetadata(item);

                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => {
                          if (isMultiSelectMode) {
                            onToggleSelectTaskForBatch(item.id);
                          } else {
                            onSelectTask(item);
                          }
                        }}
                        style={[
                          styles.taskCard,
                          !hasMetadata && styles.taskCardCompact,
                          styles.taskCardDone,
                          {
                            backgroundColor: colors.card,
                            borderColor: isSelected ? '#0078d4' : colors.border
                          }
                        ]}
                        activeOpacity={0.7}
                      >
                        {/* Left Action / Checkbox */}
                        {isMultiSelectMode ? (
                          <TouchableOpacity
                            onPress={() => onToggleSelectTaskForBatch(item.id)}
                            style={styles.checkTouchArea}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            {isBatchChecked ? (
                              <CheckSquare size={20} color="#0078d4" />
                            ) : (
                              <View style={[styles.checkboxBox, { borderColor: colors.border }]} />
                            )}
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            onPress={() => onToggleTaskComplete(item)}
                            style={styles.checkTouchArea}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <View style={[styles.checkboxBox, styles.checkboxBoxDone]}>
                              <Check size={12} color="#ffffff" strokeWidth={3} />
                            </View>
                          </TouchableOpacity>
                        )}

                        {/* Title & Metadata */}
                        <View style={styles.taskInfo}>
                          <Text
                            style={[
                              styles.taskTitle,
                              styles.taskTitleDone,
                              { color: colors.textMuted }
                            ]}
                            numberOfLines={2}
                          >
                            {item.title}
                          </Text>

                          {hasMetadata && <View style={styles.metadataRow}>
                            {Boolean(item.due_date) && (
                              <View style={styles.dateBadge}>
                                <Calendar size={11} color="#0078d4" />
                                <Text style={styles.dateText}>
                                  {item.due_date}
                                </Text>
                              </View>
                            )}
                            {Boolean(
                              item.subtask_count && item.subtask_count > 0
                            ) && (
                              <View
                                style={[
                                  styles.chipBadge,
                                  {
                                    backgroundColor: isDarkMode
                                      ? '#27272a'
                                      : '#f1f5f9'
                                  }
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.chipText,
                                    { color: colors.textMuted }
                                  ]}
                                >
                                  {item.subtask_completed_count || 0}/
                                  {item.subtask_count} steps
                                </Text>
                              </View>
                            )}
                            {Boolean(item.assignee_name) && (
                              <View
                                style={[
                                  styles.assigneeBadge,
                                  {
                                    backgroundColor: isDarkMode
                                      ? '#27272a'
                                      : '#f1f5f9'
                                  }
                                ]}
                              >
                                <Image
                                  source={{
                                    uri:
                                      item.assignee_avatar ||
                                      `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(item.assignee_name || '')}`
                                  }}
                                  style={styles.assigneeAvatar}
                                />
                                <Text
                                  style={[
                                    styles.assigneeText,
                                    { color: colors.text }
                                  ]}
                                  numberOfLines={1}
                                >
                                  {item.assignee_name?.split(' ')[0]}
                                </Text>
                              </View>
                            )}

                            {Boolean(item.lists && item.lists.length > 0) && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                  {item.lists?.map((l) => (
                                    <View
                                      key={l.id}
                                      style={[
                                        styles.chipBadge,
                                        {
                                          backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                                          borderColor: colors.border,
                                          borderWidth: 1
                                        }
                                      ]}
                                    >
                                      <Text style={[styles.chipText, { color: colors.textMuted, fontWeight: '600' }]}>
                                        {l.title}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              )}
                          </View>}
                        </View>

                        {/* Right Star Button */}
                        <TouchableOpacity
                          onPress={() => onToggleTaskImportant(item)}
                          style={styles.starTouchArea}
                          activeOpacity={0.7}
                        >
                          <Star
                            size={20}
                            color={
                              item.is_important ? '#f59e0b' : colors.textMuted
                            }
                            fill={item.is_important ? '#f59e0b' : 'transparent'}
                          />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          ) : null
        }
      />

      {/* Floating Action Button (FAB) for Adding New Task */}
      <TouchableOpacity
        onPress={() => {
          if (onOpenCreateTask) {
            onOpenCreateTask();
          }
        }}
        style={styles.fabBtn}
        activeOpacity={0.85}
        accessibilityLabel="Add new task"
      >
        <Plus size={26} color="#ffffff" strokeWidth={2.5} />
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  fabBtn: {
    position: 'absolute',
    bottom: 16,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0078d4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0078d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 50
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  modalTitle: {
    fontSize: fontSizes.medium,
    fontWeight: '800'
  },
  modalInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: fontSizes.small,
    fontWeight: '500'
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1
  },
  modalCancelText: {
    fontSize: fontSizes.small,
    fontWeight: '600'
  },
  modalCreateBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  batchBar: {
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 4,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6
  },
  batchLeftWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  batchIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  batchText: {
    color: '#f8fafc',
    fontSize: fontSizes.small,
    fontWeight: '800',
    letterSpacing: 0.2
  },
  whatsappBatchBtn: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3
  },
  whatsappBatchText: {
    color: '#ffffff',
    fontSize: fontSizes.small,
    fontWeight: '700'
  },
  listContent: {
    paddingHorizontal: 6,
    paddingTop: 10,
    paddingBottom: 100,
    gap: 8
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  emptyTitle: {
    fontSize: fontSizes.heading,
    fontWeight: '800',
    marginBottom: 6
  },
  emptySubtitle: {
    fontSize: fontSizes.small,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  taskCardCompact: {
    paddingVertical: 2,
    minHeight: 42
  },
  taskCardDone: {
    opacity: 0.65
  },
  checkTouchArea: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent'
  },
  checkboxBoxDone: {
    backgroundColor: '#0078d4',
    borderColor: '#0078d4'
  },
  taskInfo: {
    flex: 1,
    paddingRight: 4
  },
  taskTitle: {
    fontSize: fontSizes.small,
    fontWeight: '700',
    lineHeight: 20
  },
  taskTitleDone: {
    textDecorationLine: 'line-through'
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  dateText: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: '#0078d4'
  },
  chipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  chipText: {
    fontSize: fontSizes.caption,
    fontWeight: '600'
  },
  assigneeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12
  },
  assigneeAvatar: {
    width: 14,
    height: 14,
    borderRadius: 7
  },
  assigneeText: {
    fontSize: fontSizes.caption,
    fontWeight: '700'
  },
  starTouchArea: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  completedContainer: {
    marginTop: 16,
    marginBottom: 12,
    gap: 8
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4
  },
  completedHeaderText: {
    fontSize: fontSizes.caption,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  completedList: {
    gap: 8,
    marginTop: 4
  },
  allCompletedHeader: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  allCompletedIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  allCompletedTitle: {
    fontSize: fontSizes.small,
    fontWeight: '800',
    marginBottom: 4
  },
  allCompletedSubtitle: {
    fontSize: fontSizes.caption,
    fontWeight: '500',
    textAlign: 'center'
  }
});
