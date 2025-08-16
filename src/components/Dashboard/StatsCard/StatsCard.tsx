import React from 'react';
import { Card } from '../../ui/card';

interface StatsCardProps {
  title: string;
  value: string;
  icon: string;
  description: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, description }) => {
  return (
    <Card className="p-6 transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      </div>
      <div className="text-3xl font-bold text-foreground mb-2">{value}</div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Card>
  );
};