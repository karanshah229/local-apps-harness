import React, { useState, useRef, useCallback } from 'react';
import { View, Text, Modal, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { fetchTaskForNavigation } from './useTodoQueries';
import { useUiStore } from '../store/useUiStore';

export function useTaskNavigation() {
  const router = useRouter();
  const setSelectedTaskId = useUiStore((s) => s.setSelectedTaskId);
  const isDarkMode = useUiStore((s) => s.isDarkMode);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingTheme, setLoadingTheme] = useState<string>('#0078d4');

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  const openTask = useCallback(async (taskId: number, themePrimary: string = '#0078d4') => {
    if (!taskId || taskId <= 0) return;

    setLoadingTheme(themePrimary);
    isCancelledRef.current = false;

    // Start 300ms timer to show loader only if request exceeds 300ms
    timerRef.current = setTimeout(() => {
      if (!isCancelledRef.current) {
        setIsLoading(true);
      }
    }, 300);

    try {
      // Resolve task and subtasks before navigating
      await fetchTaskForNavigation(taskId);

      // Clear the timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (!isCancelledRef.current) {
        setIsLoading(false);
        setSelectedTaskId(taskId);
        router.push(`/task/${taskId}`);
      }
    } catch (err: any) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setIsLoading(false);
      Alert.alert('Unable to load task', err?.message || 'Please check your connection and try again.');
    }
  }, [router, setSelectedTaskId]);

  const TaskLoadingIndicator = useCallback(() => {
    if (!isLoading) return null;
    return (
      <Modal visible={isLoading} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.loadingCard,
              { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', borderColor: isDarkMode ? '#27272a' : '#e2e8f0' },
            ]}
          >
            <ActivityIndicator size="large" color={loadingTheme} />
            <Text
              style={[
                styles.loadingText,
                { color: isDarkMode ? '#f4f4f5' : '#0f172a' },
              ]}
            >
              Loading task...
            </Text>
          </View>
        </View>
      </Modal>
    );
  }, [isLoading, isDarkMode, loadingTheme]);

  return {
    openTask,
    isLoadingTask: isLoading,
    TaskLoadingIndicator,
  };
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    paddingHorizontal: 28,
    paddingVertical: 24,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    minWidth: 160,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '700',
  },
});
