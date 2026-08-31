import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import { Trash2, AlertTriangle, Info, AlertCircle } from 'lucide-react-native';
import { useUiStore } from '../store/useUiStore';

export const ThemedConfirmModal: React.FC = () => {
  const dialogConfig = useUiStore((s) => s.dialogConfig);
  const closeDialog = useUiStore((s) => s.closeDialog);
  const isDarkMode = useUiStore((s) => s.isDarkMode);

  if (!dialogConfig) return null;

  const {
    title,
    message,
    type = 'default',
    confirmLabel = type === 'danger' ? 'Delete' : 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
  } = dialogConfig;

  const handleCancel = () => {
    closeDialog();
    if (onCancel) onCancel();
  };

  const handleConfirm = async () => {
    closeDialog();
    if (onConfirm) {
      await onConfirm();
    }
  };

  const isDanger = type === 'danger';
  const isWarning = type === 'warning';
  const isSingleButton = cancelLabel === '';

  const IconComponent = isDanger ? Trash2 : isWarning ? AlertTriangle : isSingleButton ? Info : AlertCircle;
  const iconColor = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#0078d4';
  const iconBg = isDanger ? 'rgba(239, 68, 68, 0.15)' : isWarning ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 120, 212, 0.15)';

  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <TouchableWithoutFeedback onPress={handleCancel}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                  borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
                },
              ]}
            >
              {/* Top Icon Badge */}
              <View style={[styles.iconBadge, { backgroundColor: iconBg }]}>
                <IconComponent size={24} color={iconColor} strokeWidth={2.2} />
              </View>

              {/* Title & Message */}
              <Text
                style={[
                  styles.title,
                  { color: isDarkMode ? '#ffffff' : '#0f172a' },
                ]}
              >
                {title}
              </Text>
              {Boolean(message) && (
                <Text
                  style={[
                    styles.message,
                    { color: isDarkMode ? '#a1a1aa' : '#64748b' },
                  ]}
                >
                  {message}
                </Text>
              )}

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                {!isSingleButton && (
                  <TouchableOpacity
                    onPress={handleCancel}
                    activeOpacity={0.7}
                    style={[
                      styles.cancelButton,
                      {
                        backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                        borderColor: isDarkMode ? '#3f3f46' : '#e2e8f0',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cancelButtonText,
                        { color: isDarkMode ? '#d4d4d8' : '#475569' },
                      ]}
                    >
                      {cancelLabel}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={handleConfirm}
                  activeOpacity={0.8}
                  style={[
                    styles.confirmButton,
                    {
                      backgroundColor: isDanger ? '#ef4444' : '#0078d4',
                      flex: isSingleButton ? 1 : 1.2,
                    },
                  ]}
                >
                  <Text style={styles.confirmButtonText}>
                    {confirmLabel}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmButton: {
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});
