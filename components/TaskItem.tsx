
import React, { memo } from 'react';
import { Task, User } from '../types';
import { PRIORITY_CONFIG } from '../utils/constants';
import { isOverdue, formatDate, getPriorityLabel } from '../utils/taskHelpers';
import { getUserDisplayName } from '../utils/userHelpers';

interface TaskItemProps {
  task: Task;
  assignee?: User;
  onSelectTask: (task: Task) => void;
}

const TaskItem: React.FC<TaskItemProps> = memo(({ task, assignee, onSelectTask }) => {
  const isTaskOverdue = isOverdue(task);
  const priorityConfig = PRIORITY_CONFIG[task.priority];

  return (
    <div
      onClick={() => onSelectTask(task)}
      className={`p-4 rounded-lg shadow-md cursor-pointer transition-transform transform hover:scale-105 border-l-4 ${
        isTaskOverdue ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/50' : priorityConfig.border
      } ${isTaskOverdue ? '' : priorityConfig.bg}`}
    >
      <div className="flex justify-between items-start">
        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{task.title}</h3>
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-full ${priorityConfig.bg} ${priorityConfig.text}`}
        >
          {getPriorityLabel(task.priority)}
        </span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 truncate">{task.description}</p>
      <div className="mt-4 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
        <div>
          <span>Deadline: </span>
          <span className={`font-medium ${isTaskOverdue ? 'text-pink-600 dark:text-pink-400' : 'text-gray-700 dark:text-gray-200'}`}>
            {formatDate(task.deadline)}
          </span>
        </div>
        {assignee && (
          <div className="flex items-center">
            <span className="mr-2">Assignee:</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {getUserDisplayName(assignee)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

TaskItem.displayName = 'TaskItem';

export default TaskItem;
