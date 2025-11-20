
import React, { useState, useEffect } from 'react';
import { Task, User, Priority, Role, AppFile } from '../types';
import TrashIcon from './icons/TrashIcon';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  currentUser: User;
  users: User[];
  files: AppFile[];
  onSave: (
    task: Omit<Task, 'id_task' | 'date_created'> & { id_task?: number },
    descriptionFiles?: FileList | null
  ) => void;
  onDelete: (taskId: number) => void;
  onSubmitTask: (taskId: number, file: File) => void;
  onOpenFile: (fileId: number) => void;
  onDeleteAttachment?: (taskId: number, fileId: number) => void;
}

const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  task,
  currentUser,
  users,
  files,
  onSave,
  onDelete,
  onSubmitTask,
  onOpenFile,
  onDeleteAttachment,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [assigneeId, setAssigneeId] = useState<number>(currentUser.user_id);
  const [descriptionFiles, setDescriptionFiles] = useState<FileList | null>(null);
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [canEdit, setCanEdit] = useState(false);

  const isNewTask = task === null;
  const isAdmin = currentUser.role === Role.ADMIN;
  const isCompleted = task?.status === 'Completed' || task?.status === 'submitted';
  const isSubmitted = task?.submit_file_id !== null && task?.submit_file_id !== undefined;
  const canDelete = task && (isAdmin || task.assigner_id === currentUser.user_id) && !isCompleted;
  const canDeleteAttachment = canEdit && !isCompleted && !isSubmitted;

  useEffect(() => {
    const isTaskCreator = task ? task.assigner_id === currentUser.user_id : false;
    const canUserEdit = isNewTask || isAdmin || isTaskCreator;
    setCanEdit(canUserEdit);
    
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setDeadline(task.deadline.split('T')[0]);
      setPriority(task.priority);
      setAssigneeId(task.assignee_id);
    } else {
      // Reset for new task
      setTitle('');
      setDescription('');
      setDeadline('');
      setPriority(Priority.MEDIUM);
      setAssigneeId(currentUser.user_id);
    }
    setDescriptionFiles(null);
    setSubmissionFile(null);
  }, [task, isOpen, currentUser]);
  
  if (!isOpen) return null;

  const handleSave = () => {
    if (!canEdit) return;
    if (!title || !deadline) {
        alert("Title and Deadline are required.");
        return;
    }
    const savedTask = {
      ...(task || {}),
      title,
      description,
      deadline: new Date(deadline).toISOString(),
      priority,
      assignee_id: assigneeId,
      assigner_id: task ? task.assigner_id : currentUser.user_id,
      status: task ? task.status : 'Pending',
    };
    onSave(savedTask, descriptionFiles);
  };
  
  const handleSubmit = () => {
    if (task && submissionFile) {
      onSubmitTask(task.id_task, submissionFile);
    } else {
        alert("Please select a file to submit.");
    }
  };

  const handleDescriptionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setDescriptionFiles(e.target.files);
    }
  };

  const handleSubmissionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSubmissionFile(e.target.files[0]);
    }
  };
  
  const findUserById = (userId?: number): User | undefined => {
    if (!userId) return undefined;
    return users.find(u => u.user_id === userId);
  }

  const findFileById = (fileId?: number | null): AppFile | undefined => {
    if (!fileId) return undefined;
    return files.find(f => f.id_file === fileId);
  }

  const submissionFileDetails = findFileById(task?.submit_file_id);
  const assigner = findUserById(task?.assigner_id);
  const assignee = findUserById(task?.assignee_id);
  
  // Get attachments from task (populated from backend)
  const taskAttachments = task?.attachments || [];
  
  const handleDeleteAttachment = async (fileId: number) => {
    if (!task || !onDeleteAttachment) return;
    if (confirm('Are you sure you want to delete this file?')) {
      onDeleteAttachment(task.id_task, fileId);
    }
  };
  
  const commonInputClasses = "mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100";
  const disabledInputClasses = "disabled:bg-gray-200 dark:disabled:bg-gray-700/50 disabled:cursor-not-allowed disabled:text-gray-500";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{isNewTask ? 'Create Task' : 'Task Details'}</h2>
          {canDelete && (
            <button onClick={() => task && onDelete(task.id_task)} className="text-red-500 hover:text-red-700">
                <TrashIcon className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} disabled={!canEdit} className={`${commonInputClasses} ${disabledInputClasses}`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} disabled={!canEdit} className={`${commonInputClasses} ${disabledInputClasses}`}></textarea>
          </div>
           <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Attach Description Files</label>
            
            {/* Display existing attachments */}
            {taskAttachments.length > 0 && (
              <div className="mt-2 space-y-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">Current files:</span>
                {taskAttachments.map((file) => (
                  <div key={file.id_file} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded">
                    <a 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); onOpenFile(file.id_file); }} 
                      className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
                    >
                      {file.name}
                    </a>
                    {canDeleteAttachment && (
                      <button
                        onClick={() => handleDeleteAttachment(file.id_file)}
                        className="ml-2 text-red-500 hover:text-red-700"
                        title="Delete file"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Upload new files */}
            <input
              type="file"
              multiple
              onChange={handleDescriptionFileChange}
              disabled={!canEdit}
              className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/50 dark:file:text-indigo-300 dark:hover:file:bg-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {descriptionFiles && descriptionFiles.length > 0 && (
              <p className="text-xs mt-1 text-gray-500">
                {descriptionFiles.length} file(s) selected
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Deadline</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} disabled={!canEdit} className={`${commonInputClasses} ${disabledInputClasses}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
              <select value={priority} onChange={e => setPriority(Number(e.target.value) as Priority)} disabled={!canEdit} className={`${commonInputClasses} ${disabledInputClasses}`}>
                <option value={Priority.LOW}>Low</option>
                <option value={Priority.MEDIUM}>Medium</option>
                <option value={Priority.HIGH}>High</option>
              </select>
            </div>
          </div>
          
          {!isNewTask && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assigned By</label>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100 p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                  {assigner?.name || assigner?.email || 'N/A'}
                </p>
              </div>
              {!isAdmin && ( // Non-admins see a static field for assignee
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assigned To</label>
                  <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100 p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                    {assignee?.name || assignee?.email || 'N/A'}
                  </p>
                </div>
              )}
            </div>
          )}

          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assign To</label>
              <select value={assigneeId} onChange={e => setAssigneeId(Number(e.target.value))} disabled={!canEdit} className={`${commonInputClasses} ${disabledInputClasses}`}>
                {users.map(u => <option key={u.user_id} value={u.user_id}>{u.name || u.email}</option>)}
              </select>
            </div>
          )}

          {!isNewTask && task.status === 'Completed' && (
             <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 p-3 rounded-md space-y-1">
                <p><strong>Status:</strong> Completed</p>
                <p><strong>Submitted on:</strong> {new Date(task.date_submit!).toLocaleString()}</p>
                <p><strong>Score:</strong> {task.score}</p>
                {task.attachments && task.attachments.length > 0 && (
                    <p><strong>Description Files: </strong> 
                        {task.attachments.map((file, idx) => (
                            <span key={file.id_file}>
                                <a href="#" onClick={(e) => { e.preventDefault(); onOpenFile(file.id_file); }} className="font-medium hover:underline">{file.name}</a>
                                {idx < task.attachments!.length - 1 && ', '}
                            </span>
                        ))}
                    </p>
                )}
                {submissionFileDetails && (
                    <p><strong>Submitted File: </strong>
                        <a href="#" onClick={(e) => { e.preventDefault(); onOpenFile(submissionFileDetails.id_file); }} className="font-medium hover:underline">{submissionFileDetails.name}</a>
                    </p>
                )}
            </div>
          )}

          {!isNewTask && task.status === 'Pending' && task.assignee_id === currentUser.user_id && (
            <div className="border-t pt-4 mt-4 dark:border-gray-600">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Submit Your Work</h3>
               {task.attachments && task.attachments.length > 0 && (
                 <div className="mb-3 text-sm">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Description Files: </span>
                    {task.attachments.map((file, idx) => (
                        <span key={file.id_file}>
                            <a href="#" onClick={(e) => { e.preventDefault(); onOpenFile(file.id_file); }} className="text-indigo-600 dark:text-indigo-400 hover:underline">{file.name}</a>
                            {idx < task.attachments!.length - 1 && ', '}
                        </span>
                    ))}
                 </div>
              )}
              <input type="file" onChange={handleSubmissionFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/50 dark:file:text-indigo-300 dark:hover:file:bg-indigo-900"/>
              {submissionFile && <p className="text-xs mt-1 text-gray-500">Selected: {submissionFile.name}</p>}
              <button onClick={handleSubmit} className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md">
                Submit Task
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-end space-x-3">
          <button onClick={onClose} className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-bold py-2 px-4 rounded-md">Close</button>
          {canEdit && (
            <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md">{isNewTask ? 'Create' : 'Save Changes'}</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
