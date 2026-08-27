import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet
} from 'react-native';
import {
  Plus,
  Star,
  CheckCircle2,
  Circle,
  CheckSquare,
  Square,
  Calendar,
  Send,
  ListTodo
} from 'lucide-react-native';
import { Task, List } from '@saileshbhai/todo-shared';
import { lightColors, darkColors } from '../theme/colors';

interface TaskMainViewProps {
  activeView: string | null;
  activeList?: List | null;
  tasks: Task[];
  selectedTaskId?: number | null;
  onSelectTask: (task: Task) => void;
  onCreateTask: (taskData: { title: string; is_important?: number; list_id?: number | null }) => void;
  onToggleTaskComplete: (task: Task) => void;
  onToggleTaskImportant: (task: Task) => void;
  onOpenWhatsAppModal: (config: any) => void;
  isMultiSelectMode: boolean;
  selectedTaskIds: number[];
  onToggleSelectTaskForBatch: (taskId: number) => void;
  isDarkMode: boolean;
}

export default function TaskMainView({
  activeView,
  activeList,
  tasks,
  selectedTaskId,
  onSelectTask,
  onCreateTask,
  onToggleTaskComplete,
  onToggleTaskImportant,
  onOpenWhatsAppModal,
  isMultiSelectMode,
  selectedTaskIds,
  onToggleSelectTaskForBatch,
  isDarkMode
}: TaskMainViewProps) {
  const [taskInput, setTaskInput] = useState('');
  const colors = isDarkMode ? darkColors : lightColors;

  const getHeaderTitle = () => {
    if (activeList) return activeList.title;
    switch (activeView) {
      case 'important':
        return 'Important';
      case 'assigned-to-me':
        return 'Assigned to me';
      case 'all-tasks':
      default:
        return 'Tasks';
    }
  };

  const handleAddTask = () => {
    if (!taskInput.trim()) return;
    onCreateTask({
      title: taskInput.trim(),
      is_important: activeView === 'important' ? 1 : 0,
      list_id: activeList ? activeList.id : null
    });
    setTaskInput('');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Quick Add Task Input Card */}
      <View style={styles.quickAddContainer}>
        <View
          style={[
            styles.quickAddCard,
            { backgroundColor: colors.card, borderColor: colors.border }
          ]}
        >
          <View style={styles.plusIconWrap}>
            <Plus size={20} color="#0078d4" />
          </View>
          <TextInput
            placeholder={`Add a task to "${getHeaderTitle()}"...`}
            placeholderTextColor={colors.textMuted}
            value={taskInput}
            onChangeText={setTaskInput}
            onSubmitEditing={handleAddTask}
            returnKeyType="done"
            style={[styles.input, { color: colors.text }]}
          />
          {taskInput.trim().length > 0 && (
            <TouchableOpacity
              onPress={handleAddTask}
              style={styles.addButton}
              activeOpacity={0.8}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Batch Multi-Select Digest Bar */}
      {isMultiSelectMode && selectedTaskIds.length > 0 && (
        <View style={styles.batchBar}>
          <Text style={styles.batchText}>
            {selectedTaskIds.length} Task(s) Selected
          </Text>
          <TouchableOpacity
            onPress={() =>
              onOpenWhatsAppModal({
                type: 'batch',
                taskIds: selectedTaskIds
              })
            }
            style={styles.whatsappBatchBtn}
            activeOpacity={0.8}
          >
            <Send size={14} color="#ffffff" />
            <Text style={styles.whatsappBatchText}>
              Send WhatsApp ({selectedTaskIds.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tasks List */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
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
        }
        renderItem={({ item }) => {
          const isSelected = selectedTaskId === item.id;
          const isBatchChecked = selectedTaskIds.includes(item.id);
          const isDone = Boolean(item.is_completed);

          return (
            <TouchableOpacity
              onPress={() => {
                if (isMultiSelectMode) {
                  onToggleSelectTaskForBatch(item.id);
                } else {
                  onSelectTask(item);
                }
              }}
              style={[
                styles.taskCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isSelected ? '#0078d4' : colors.border
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
                >
                  {isBatchChecked ? (
                    <CheckSquare size={22} color="#0078d4" />
                  ) : (
                    <Square size={22} color={colors.textMuted} />
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => onToggleTaskComplete(item)}
                  style={styles.checkTouchArea}
                >
                  {isDone ? (
                    <CheckCircle2 size={22} color="#0078d4" />
                  ) : (
                    <Circle size={22} color={colors.textMuted} />
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

                <View style={styles.metadataRow}>
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
                </View>
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  quickAddContainer: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4
  },
  quickAddCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  plusIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 120, 212, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 6
  },
  addButton: {
    backgroundColor: '#0078d4',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  batchBar: {
    marginHorizontal: 14,
    marginTop: 8,
    backgroundColor: '#0078d4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4
  },
  batchText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  },
  whatsappBatchBtn: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10
  },
  whatsappBatchText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  listContent: {
    paddingHorizontal: 14,
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
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  taskCardDone: {
    opacity: 0.65
  },
  checkTouchArea: {
    padding: 4,
    marginRight: 8
  },
  taskInfo: {
    flex: 1,
    paddingRight: 8
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19
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
    gap: 3
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0078d4'
  },
  chipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  chipText: {
    fontSize: 10,
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
    fontSize: 10,
    fontWeight: '700'
  },
  starTouchArea: {
    padding: 6
  }
});
