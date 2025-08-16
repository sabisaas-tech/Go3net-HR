import { toast } from '../hooks/use-toast';

export const showToast = {
  success: (title: string, description?: string) => {
    const toastInstance = toast({
      title,
      description,
      variant: 'default',
    });
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      toastInstance.dismiss();
    }, 3000);
    
    return toastInstance;
  },
  
  error: (title: string, description?: string) => {
    const toastInstance = toast({
      title,
      description,
      variant: 'destructive',
    });
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      toastInstance.dismiss();
    }, 3000);
    
    return toastInstance;
  },
  
  info: (title: string, description?: string) => {
    const toastInstance = toast({
      title,
      description,
      variant: 'default',
    });
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      toastInstance.dismiss();
    }, 3000);
    
    return toastInstance;
  },
  
  warning: (title: string, description?: string) => {
    const toastInstance = toast({
      title,
      description,
      variant: 'destructive',
    });
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      toastInstance.dismiss();
    }, 3000);
    
    return toastInstance;
  }
};