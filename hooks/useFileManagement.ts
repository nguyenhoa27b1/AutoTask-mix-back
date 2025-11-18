import { useCallback } from 'react';
import { AppFile } from '../types';
import { api } from '../services/api';

export const useFileManagement = () => {
  const openFile = useCallback((fileId: number) => {
    const file = api.getFileById(fileId);
    if (file && file.url) {
      window.open(file.url, '_blank');
    }
  }, []);

  const downloadFile = useCallback((fileId: number) => {
    const file = api.getFileById(fileId);
    if (file && file.url) {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      link.click();
    }
  }, []);

  return {
    openFile,
    downloadFile,
  };
};
