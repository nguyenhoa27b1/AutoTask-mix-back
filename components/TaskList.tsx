
import React, { memo } from 'react';
import { Task, User } from '../types';
import TaskItem from './TaskItem';
import { findUser } from '../utils/userHelpers';

interface TaskListProps {
  title: string;
  tasks: Task[];
  users: User[];
  onSelectTask: (task: Task) => void;
  variant?: 'overdue' | 'default';
}

const TaskList: React.FC<TaskListProps> = memo(({ title, tasks, users, onSelectTask, variant = 'default' }) => {
  if (tasks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">{title}</h2>
        <p className="text-gray-500 dark:text-gray-400">No tasks in this category.</p>
      </div>
    );
  }

  const isOverdue = variant === 'overdue';

  return (
    <div className={`p-6 rounded-xl shadow-lg ${isOverdue ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500' : 'bg-white dark:bg-gray-800'}`}>
      <h2 className={`text-2xl font-bold mb-4 ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-100'}`}>
        {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map(task => (
          <TaskItem
            key={task.id_task}
            task={task}
            assignee={findUser(users, task.assignee_id)}
            onSelectTask={onSelectTask}
            isOverdue={isOverdue}
          />
        ))}
      </div>
    </div>
  );
});

TaskList.displayName = 'TaskList';

export default TaskList;
