import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Alert,
  Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Trash2,
  CheckCircle2,
  Circle,
  Plus,
  Calendar,
  Clock,
  Send,
  FileText,
  User as UserIcon,
  X
} from 'lucide-react-native';
import { Task, Subtask, User } from '@saileshbhai/todo-shared';
import { lightColors, darkColors } from '../theme/colors';

interface TaskDetailDrawerProps {
  task: Task | null;
  users: User[];
  onClose: () => void;
  onUpdateTask: (updates: Partial<Task> & { id: number }) => void;
  onDeleteTask: (taskId: number) => void;
  onOpenWhatsAppModal: (config: any) => void;
  subtasks: Subtask[];
  onCreateSubtask: (taskId: number, title: string) => void;
  onToggleSubtask: (subtask: Subtask) => void;
  onDeleteSubtask: (subtaskId: number) => void;
  isDarkMode: boolean;
}

export default function TaskDetailDrawer({
  task,
  users,
  onClose,
  onUpdateTask,
  onDeleteTask,
  onOpenWhatsAppModal,
  subtasks,
  onCreateSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  isDarkMode
}: TaskDetailDrawerProps) {
  const [titleValue, setTitleValue] = useState('');
  const [notesValue, setNotesValue] = useState('');
  const [newStepTitle, setNewStepTitle] = useState('');
  const [showAssigneeModal, setShowAssigneeModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState('');

  const colors = isDarkMode ? darkColors : lightColors;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (task) {
      setTitleValue(task.title || '');
      setNotesValue(task.notes || '');
    }
  }, [task]);

  if (!task) return null;

  const isDone = Boolean(task.is_completed);
  const completedStepsCount = subtasks.filter((s) => Boolean(s.is_completed)).length;
  const assignedUser = users.find((u) => u.id === task.assigned_to_user_id);

  const handleTitleBlur = () => {
    if (titleValue.trim() && titleValue !== task.title) {
      onUpdateTask({ id: task.id, title: titleValue.trim() });
    }
  };

  const handleNotesBlur = () => {
    if (notesValue !== (task.notes || '')) {
      onUpdateTask({ id: task.id, notes: notesValue });
    }
  };

  const handleAddStep = () => {
    if (!newStepTitle.trim()) return;
    onCreateSubtask(task.id, newStepTitle.trim());
    setNewStepTitle('');
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteTask(task.id)
        }
      ]
    );
  };

  return (
    <View
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, 12)
        }
      ]}
    >
      {/* Top Header App Bar */}
      <View
        style={[
          styles.headerBar,
          { backgroundColor: colors.card, borderBottomColor: colors.border }
        ]}
      >
        <TouchableOpacity
          onPress={onClose}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#0078d4" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.textMuted }]}>
          TASK DETAILS
        </Text>

        <TouchableOpacity
          onPress={confirmDelete}
          style={styles.deleteIconButton}
          activeOpacity={0.7}
        >
          <Trash2 size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Task Title & Completion Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border }
          ]}
        >
          <TouchableOpacity
            onPress={() =>
              onUpdateTask({
                id: task.id,
                is_completed: isDone ? 0 : 1
              })
            }
            style={styles.checkTouch}
            activeOpacity={0.7}
          >
            {isDone ? (
              <CheckCircle2 size={24} color="#0078d4" />
            ) : (
              <Circle size={24} color={colors.textMuted} />
            )}
          </TouchableOpacity>
          <TextInput
            value={titleValue}
            onChangeText={setTitleValue}
            onBlur={handleTitleBlur}
            style={[
              styles.titleInput,
              { color: colors.text },
              isDone && [styles.titleInputDone, { color: colors.textMuted }]
            ]}
            multiline
          />
        </View>

        {/* Assignee Card */}
        <TouchableOpacity
          onPress={() => setShowAssigneeModal(true)}
          style={[
            styles.card,
            styles.cardRow,
            { backgroundColor: colors.card, borderColor: colors.border }
          ]}
          activeOpacity={0.7}
        >
          {assignedUser ? (
            <Image
              source={{
                uri:
                  assignedUser.avatar ||
                  `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(assignedUser.name)}`
              }}
              style={styles.assigneeAvatar}
            />
          ) : (
            <View
              style={[
                styles.assigneePlaceholder,
                { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }
              ]}
            >
              <UserIcon size={18} color={colors.textMuted} />
            </View>
          )}

          <View style={styles.assigneeInfo}>
            <Text style={styles.cardSectionLabel}>ASSIGNEE</Text>
            <Text
              style={[
                styles.assigneeNameText,
                { color: assignedUser ? colors.text : colors.textMuted }
              ]}
              numberOfLines={1}
            >
              {assignedUser
                ? `${assignedUser.name} (${assignedUser.phone})`
                : 'Unassigned (Tap to assign contact...)'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Steps Checklist Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border }
          ]}
        >
          <View style={styles.stepsHeaderRow}>
            <Text style={styles.cardSectionLabel}>
              STEPS CHECKLIST ({completedStepsCount}/{subtasks.length})
            </Text>
            {subtasks.length > 0 && (
              <View style={styles.percentBadge}>
                <Text style={styles.percentText}>
                  {Math.round((completedStepsCount / subtasks.length) * 100)}% Done
                </Text>
              </View>
            )}
          </View>

          {/* Subtasks List */}
          <View style={styles.stepsList}>
            {subtasks.map((step) => {
              const stepDone = Boolean(step.is_completed);
              return (
                <View
                  key={step.id}
                  style={[
                    styles.stepRow,
                    { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc' }
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => onToggleSubtask(step)}
                    style={styles.stepCheckTouch}
                  >
                    {stepDone ? (
                      <CheckCircle2 size={18} color="#0078d4" />
                    ) : (
                      <Circle size={18} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>

                  <Text
                    style={[
                      styles.stepTitle,
                      { color: colors.text },
                      stepDone && [styles.stepTitleDone, { color: colors.textMuted }]
                    ]}
                  >
                    {step.title}
                  </Text>

                  <TouchableOpacity
                    onPress={() => onDeleteSubtask(step.id)}
                    style={styles.stepDeleteTouch}
                  >
                    <Trash2 size={14} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* Add Step Input */}
          <View style={styles.addStepRow}>
            <Plus size={18} color="#0078d4" />
            <TextInput
              placeholder="Add next step..."
              placeholderTextColor={colors.textMuted}
              value={newStepTitle}
              onChangeText={setNewStepTitle}
              onSubmitEditing={handleAddStep}
              returnKeyType="done"
              style={[styles.addStepInput, { color: colors.text }]}
            />
            {newStepTitle.trim().length > 0 && (
              <TouchableOpacity onPress={handleAddStep} style={styles.addStepBtn}>
                <Text style={styles.addStepBtnText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Due Date & Reminder Pickers */}
        <View style={styles.pickersContainer}>
          <TouchableOpacity
            onPress={() => {
              setTempDate(task.due_date || '');
              setShowDatePicker(true);
            }}
            style={[
              styles.card,
              styles.pickerRow,
              { backgroundColor: colors.card, borderColor: colors.border }
            ]}
            activeOpacity={0.7}
          >
            <Calendar size={20} color="#0078d4" />
            <View style={styles.pickerTextWrap}>
              <Text style={styles.cardSectionLabel}>DUE DATE</Text>
              <Text
                style={[
                  styles.pickerValueText,
                  { color: task.due_date ? colors.text : colors.textMuted }
                ]}
              >
                {task.due_date || 'No due date (Tap to set)'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* WhatsApp Direct Action Button */}
        <TouchableOpacity
          onPress={() =>
            onOpenWhatsAppModal({
              type: 'single',
              taskId: task.id,
              recipientUserId: task.assigned_to_user_id
            })
          }
          style={styles.whatsappActionBtn}
          activeOpacity={0.8}
        >
          <Send size={18} color="#ffffff" />
          <Text style={styles.whatsappActionText}>Send WhatsApp Reminder</Text>
        </TouchableOpacity>

        {/* Notes Area */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border }
          ]}
        >
          <View style={styles.notesHeaderRow}>
            <FileText size={14} color={colors.textMuted} />
            <Text style={styles.cardSectionLabel}>NOTES</Text>
          </View>
          <TextInput
            placeholder="Add detailed notes for this task..."
            placeholderTextColor={colors.textMuted}
            value={notesValue}
            onChangeText={setNotesValue}
            onBlur={handleNotesBlur}
            multiline
            numberOfLines={4}
            style={[styles.notesInput, { color: colors.text }]}
          />
        </View>
      </ScrollView>

      {/* Assignee Selection Modal */}
      <Modal
        visible={showAssigneeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAssigneeModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowAssigneeModal(false)}
        >
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border }
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Assign Contact
            </Text>

            <ScrollView style={{ maxHeight: 300 }}>
              <TouchableOpacity
                onPress={() => {
                  onUpdateTask({ id: task.id, assigned_to_user_id: null });
                  setShowAssigneeModal(false);
                }}
                style={[
                  styles.assigneeOption,
                  !task.assigned_to_user_id && styles.assigneeOptionActive
                ]}
              >
                <Text style={{ color: colors.textMuted, fontWeight: '700' }}>
                  🚫 Unassign Task
                </Text>
              </TouchableOpacity>

              {users.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  onPress={() => {
                    onUpdateTask({ id: task.id, assigned_to_user_id: u.id });
                    setShowAssigneeModal(false);
                  }}
                  style={[
                    styles.assigneeOption,
                    task.assigned_to_user_id === u.id && styles.assigneeOptionActive
                  ]}
                >
                  <Image
                    source={{
                      uri:
                        u.avatar ||
                        `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(u.name)}`
                    }}
                    style={styles.assigneeOptionAvatar}
                  />
                  <View>
                    <Text style={[styles.assigneeOptionName, { color: colors.text }]}>
                      {u.name}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                      {u.phone}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Due Date Edit Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border }
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Set Due Date (YYYY-MM-DD)
            </Text>
            <TextInput
              placeholder="e.g. 2026-08-30"
              placeholderTextColor={colors.textMuted}
              value={tempDate}
              onChangeText={setTempDate}
              style={[
                styles.modalInput,
                { color: colors.text, borderColor: colors.border }
              ]}
            />
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                onPress={() => {
                  onUpdateTask({ id: task.id, due_date: null });
                  setShowDatePicker(false);
                }}
                style={styles.modalCancelBtn}
              >
                <Text style={{ color: '#ef4444', fontWeight: '700' }}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  onUpdateTask({ id: task.id, due_date: tempDate.trim() || null });
                  setShowDatePicker(false);
                }}
                style={styles.modalSaveBtn}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  headerBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: 1
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 6
  },
  backText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0078d4'
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1
  },
  deleteIconButton: {
    padding: 8
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 14,
    gap: 12,
    paddingBottom: 40
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  checkTouch: {
    padding: 4,
    marginRight: 6
  },
  titleInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22
  },
  titleInputDone: {
    textDecorationLine: 'line-through'
  },
  cardSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 2
  },
  assigneeAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19
  },
  assigneePlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center'
  },
  assigneeInfo: {
    flex: 1
  },
  assigneeNameText: {
    fontSize: 14,
    fontWeight: '700'
  },
  stepsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  percentBadge: {
    backgroundColor: '#0078d4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8
  },
  percentText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800'
  },
  stepsList: {
    gap: 6
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12
  },
  stepCheckTouch: {
    padding: 2,
    marginRight: 8
  },
  stepTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600'
  },
  stepTitleDone: {
    textDecorationLine: 'line-through'
  },
  stepDeleteTouch: {
    padding: 4
  },
  addStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)'
  },
  addStepInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600'
  },
  addStepBtn: {
    backgroundColor: '#0078d4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  addStepBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  pickersContainer: {
    gap: 10
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  pickerTextWrap: {
    flex: 1
  },
  pickerValueText: {
    fontSize: 13,
    fontWeight: '700'
  },
  whatsappActionBtn: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 16,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3
  },
  whatsappActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800'
  },
  notesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6
  },
  notesInput: {
    fontSize: 13,
    fontWeight: '500',
    minHeight: 80,
    textAlignVertical: 'top',
    lineHeight: 19
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
    textAlign: 'center'
  },
  assigneeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    marginBottom: 4
  },
  assigneeOptionActive: {
    backgroundColor: 'rgba(0, 120, 212, 0.12)'
  },
  assigneeOptionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16
  },
  assigneeOptionName: {
    fontSize: 13,
    fontWeight: '700'
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 14
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  modalSaveBtn: {
    backgroundColor: '#0078d4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10
  }
});
