import React from 'react';
import { TasksView } from '../../src/components/TasksView';

export default function AssignedScreen() {
  return <TasksView fixedView="assigned-to-me" />;
}
