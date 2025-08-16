import React from 'react';
import Dashboard from './Dashboard';
import { useAuth } from '../contexts/AuthContext';

const Index = () => {
  const { user } = useAuth();
  
  if (!user) return null;
  
  return <Dashboard />;
};

export default Index;