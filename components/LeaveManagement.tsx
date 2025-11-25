import React, { useState, useEffect } from 'react';
import { LeaveRequest, LeaveRequestStatus, User, Role } from '../types';
import { getLeaveRequests, approveLeaveRequest, rejectLeaveRequest, deleteLeaveRequest } from '../services/api';

interface LeaveManagementProps {
  currentUser: User;
  users: User[];
}

const LeaveManagement: React.FC<LeaveManagementProps> = ({ currentUser, users }) => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const isAdmin = currentUser.role === Role.ADMIN;

  useEffect(() => {
    loadLeaveRequests();
  }, []);

  const loadLeaveRequests = async () => {
    setLoading(true);
    try {
      const requests = await getLeaveRequests();
      setLeaveRequests(requests);
    } catch (error) {
      console.error('Failed to load leave requests:', error);
      alert('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: number) => {
    const notes = prompt('Add approval notes (optional):');
    if (notes === null) return; // User cancelled

    try {
      await approveLeaveRequest(requestId, notes || undefined);
      alert('Leave request approved successfully');
      await loadLeaveRequests();
    } catch (error) {
      console.error('Failed to approve leave request:', error);
      alert('Failed to approve leave request');
    }
  };

  const handleReject = async (requestId: number) => {
    const notes = prompt('Add rejection reason (required):');
    if (!notes || !notes.trim()) {
      alert('Rejection reason is required');
      return;
    }

    try {
      await rejectLeaveRequest(requestId, notes);
      alert('Leave request rejected');
      await loadLeaveRequests();
    } catch (error) {
      console.error('Failed to reject leave request:', error);
      alert('Failed to reject leave request');
    }
  };

  const handleDelete = async (requestId: number) => {
    if (!confirm('Are you sure you want to delete this leave request?')) {
      return;
    }

    try {
      await deleteLeaveRequest(requestId);
      alert('Leave request deleted');
      await loadLeaveRequests();
    } catch (error) {
      console.error('Failed to delete leave request:', error);
      alert('Failed to delete leave request');
    }
  };

  const getUserName = (userId: number): string => {
    const user = users.find(u => u.user_id === userId);
    return user?.name || user?.email || 'Unknown User';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: LeaveRequestStatus) => {
    switch (status) {
      case LeaveRequestStatus.PENDING:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pending</span>;
      case LeaveRequestStatus.APPROVED:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Approved</span>;
      case LeaveRequestStatus.REJECTED:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Rejected</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">{status}</span>;
    }
  };

  const filteredRequests = leaveRequests.filter(req => {
    if (filter === 'all') return true;
    return req.status.toLowerCase() === filter;
  });

  if (loading) {
    return <div className="text-center py-8 text-gray-600 dark:text-gray-400">Loading leave requests...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isAdmin ? 'Manage Leave Requests' : 'My Leave Requests'}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            All ({leaveRequests.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              filter === 'pending'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Pending ({leaveRequests.filter(r => r.status === LeaveRequestStatus.PENDING).length})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              filter === 'approved'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Approved ({leaveRequests.filter(r => r.status === LeaveRequestStatus.APPROVED).length})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              filter === 'rejected'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Rejected ({leaveRequests.filter(r => r.status === LeaveRequestStatus.REJECTED).length})
          </button>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">No leave requests found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map(request => (
            <div
              key={request.id_leave}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {getUserName(request.user_id)}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Requested on {formatDate(request.date_created)}
                  </p>
                </div>
                {getStatusBadge(request.status)}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date:</span>
                  <p className="text-sm text-gray-900 dark:text-white">{formatDate(request.start_date)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">End Date:</span>
                  <p className="text-sm text-gray-900 dark:text-white">{formatDate(request.end_date)}</p>
                </div>
              </div>

              <div className="mb-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Reason:</span>
                <p className="text-sm text-gray-900 dark:text-white mt-1">{request.reason}</p>
              </div>

              {request.status !== LeaveRequestStatus.PENDING && request.date_reviewed && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Reviewed by:</strong> {request.reviewer_name || getUserName(request.reviewed_by!)}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Reviewed on:</strong> {formatDate(request.date_reviewed)}
                  </p>
                  {request.notes && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                      <strong>Notes:</strong> {request.notes}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                {isAdmin && request.status === LeaveRequestStatus.PENDING && (
                  <>
                    <button
                      onClick={() => handleApprove(request.id_leave)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(request.id_leave)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md"
                    >
                      Reject
                    </button>
                  </>
                )}
                {(isAdmin || request.user_id === currentUser.user_id) && request.status === LeaveRequestStatus.PENDING && (
                  <button
                    onClick={() => handleDelete(request.id_leave)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-md"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;
