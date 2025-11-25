
import React, { memo } from 'react';
import { Task, User } from '../types';
import { PRIORITY_CONFIG } from '../utils/constants';
import { isOverdue, formatDate, getPriorityLabel } from '../utils/taskHelpers';
import { getUserDisplayName } from '../utils/userHelpers';

interface TaskItemProps {
  task: Task;
  assignee?: User;
  onSelectTask: (task: Task) => void;
  isOverdue?: boolean;
}

const TaskItem: React.FC<TaskItemProps> = memo(({ task, assignee, onSelectTask, isOverdue: isOverdueProp }) => {
  const isTaskOverdue = isOverdueProp || isOverdue(task) || task.isOverdue || task.status === 'Overdue';
  const priorityConfig = PRIORITY_CONFIG[task.priority];

  return (
    <div
      onClick={() => onSelectTask(task)}
      className={`p-4 rounded-lg shadow-md cursor-pointer transition-transform transform hover:scale-105 border-l-4 relative ${
        isTaskOverdue ? 'border-red-500 bg-red-50 dark:bg-red-900/30' : priorityConfig.border
      } ${isTaskOverdue ? '' : priorityConfig.bg}`}
    >
      {isTaskOverdue && (
        <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
          OVERDUE
        </div>
      )}
      <div className="flex justify-between items-start">
        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 pr-20">{task.title}</h3>
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
          <span className={`font-medium ${isTaskOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-200'}`}>
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
