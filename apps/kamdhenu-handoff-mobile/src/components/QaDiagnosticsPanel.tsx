import React, { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { AlertTriangle, Bug, Database, Radio, ShieldCheck } from 'lucide-react-native';
import { IS_QA_BUILD } from '../config/buildIdentity';
import { useUiStore } from '../store/useUiStore';
import {
  captureQaHandledError,
  emitQaBreadcrumbProbe,
  generateQaRetentionProbe,
  triggerQaJsCrash,
  triggerQaNativeCrash,
} from '../services/qaDiagnostics';

type QaAction = 'breadcrumb' | 'error' | 'retention' | 'js-crash' | 'native-crash';

export function QaDiagnosticsPanel({ isDarkMode }: { isDarkMode: boolean }) {
  const [running, setRunning] = useState<QaAction | null>(null);
  const showAlertDialog = useUiStore(state => state.showAlertDialog);
  const showConfirmDialog = useUiStore(state => state.showConfirmDialog);

  if (!IS_QA_BUILD) return null;

  const run = async (action: QaAction, operation: () => Promise<unknown>, success: string) => {
    setRunning(action);
    try {
      const result = await operation();
      showAlertDialog(
        'QA diagnostic complete',
        typeof result === 'string' ? `${success}\n\nRun ID: ${result}` : success
      );
    } catch (error) {
      showAlertDialog(
        'QA diagnostic failed',
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setRunning(null);
    }
  };

  const confirmCrash = (
    kind: 'JavaScript' | 'native',
    action: QaAction,
    operation: () => Promise<unknown>
  ) => {
    showConfirmDialog({
      title: `Trigger ${kind} crash?`,
      message:
        'The QA app will close deliberately. Reopen it after Android reports the crash. Production app data is not affected.',
      type: 'danger',
      confirmLabel: 'Crash QA app',
      cancelLabel: 'Cancel',
      onConfirm: () => run(action, operation, 'Crash requested.'),
    });
  };

  const colors = {
    card: isDarkMode ? '#18181b' : '#ffffff',
    border: isDarkMode ? '#713f12' : '#fed7aa',
    text: isDarkMode ? '#ffffff' : '#0f172a',
    muted: isDarkMode ? '#a1a1aa' : '#64748b',
  };

  const actions = [
    {
      id: 'breadcrumb' as const,
      label: 'Emit breadcrumb probe',
      detail: 'Writes a safe local event and a Sentry breadcrumb.',
      icon: Radio,
      color: '#0078d4',
      operation: emitQaBreadcrumbProbe,
    },
    {
      id: 'error' as const,
      label: 'Capture handled error',
      detail: 'Creates a Sentry Issue with the current breadcrumb trail.',
      icon: Bug,
      color: '#dc2626',
      operation: captureQaHandledError,
    },
    {
      id: 'retention' as const,
      label: 'Generate 260 retention events',
      detail: 'Tests the 250-entry local ring buffer and file flush.',
      icon: Database,
      color: '#7c3aed',
      operation: generateQaRetentionProbe,
    },
  ];

  return (
    <View style={{ marginBottom: 24 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          marginBottom: 8,
          paddingLeft: 4,
        }}
      >
        <ShieldCheck size={16} color="#f97316" />
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#f97316', letterSpacing: 0.8 }}>
          QA DIAGNOSTICS
        </Text>
      </View>
      <View
        style={{
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          overflow: 'hidden',
        }}
      >
        <View
          style={{ padding: 14, backgroundColor: isDarkMode ? 'rgba(249,115,22,0.12)' : '#fff7ed' }}
        >
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>
            Isolated QA build
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 3 }}>
            These controls never appear in the production app.
          </Text>
        </View>
        {actions.map(({ id, label, detail, icon: Icon, color, operation }, index) => (
          <TouchableOpacity
            key={id}
            onPress={() => run(id, operation, `${label} finished and was flushed.`)}
            disabled={running !== null}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 14,
              gap: 12,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: isDarkMode ? '#27272a' : '#e2e8f0',
            }}
          >
            <Icon size={19} color={color} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{label}</Text>
              <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{detail}</Text>
            </View>
            {running === id ? <ActivityIndicator size="small" color={color} /> : null}
          </TouchableOpacity>
        ))}
        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            padding: 14,
            borderTopWidth: 1,
            borderTopColor: isDarkMode ? '#27272a' : '#e2e8f0',
          }}
        >
          <TouchableOpacity
            onPress={() => confirmCrash('JavaScript', 'js-crash', triggerQaJsCrash)}
            disabled={running !== null}
            style={{
              flex: 1,
              paddingVertical: 11,
              borderRadius: 12,
              backgroundColor: '#b91c1c',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 12 }}>JS crash</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => confirmCrash('native', 'native-crash', triggerQaNativeCrash)}
            disabled={running !== null}
            style={{
              flex: 1,
              paddingVertical: 11,
              borderRadius: 12,
              backgroundColor: '#7f1d1d',
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            <AlertTriangle size={14} color="#ffffff" />
            <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 12 }}>Native crash</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
