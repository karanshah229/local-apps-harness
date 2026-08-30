import React, { useEffect } from 'react';
import { TasksView } from '../../src/components/TasksView';
import { useUpdateUserPreferencesMutation, useUserPreferencesQuery } from '../../src/hooks/useTodoQueries';

export default function TasksScreen() {
  const { data: prefs } = useUserPreferencesQuery(1);
  const updatePrefs = useUpdateUserPreferencesMutation();

  useEffect(() => {
    if (prefs?.remember_last_view && (prefs?.last_view_id !== 'all-tasks' || prefs?.last_view_type !== 'tab')) {
      updatePrefs.mutate({ last_view_type: 'tab', last_view_id: 'all-tasks' });
    }
  }, [prefs?.remember_last_view, prefs?.last_view_id, prefs?.last_view_type]);

  return <TasksView fixedView="all-tasks" />;
}
