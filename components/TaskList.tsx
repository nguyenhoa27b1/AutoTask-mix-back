
import React, { memo } from 'react';
import { Task, User } from '../types';
import TaskItem from './TaskItem';
import { findUser } from '../utils/userHelpers';

interface TaskListProps {
  title: string;
  tasks: Task[];
  users: User[];
  onSelectTask: (task: Task) => void;
}

const TaskList: React.FC<TaskListProps> = memo(({ title, tasks, users, onSelectTask }) => {
  if (tasks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">{title}</h2>
        <p className="text-gray-500 dark:text-gray-400">No tasks in this category.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map(task => (
          <TaskItem
            key={task.id_task}
            task={task}
            assignee={findUser(users, task.assignee_id)}
            onSelectTask={onSelectTask}
          />
        ))}
      </div>
    </div>
  );
});

TaskList.displayName = 'TaskList';

export default TaskList;
