import React from 'react';
import { Card } from '../../ui/card';
import styles from './StatsCard.module.css';

interface StatsCardProps {
  title: string;
  value: string;
  icon: string;
  description: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, description }) => {
  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <span className={styles.icon}>{icon}</span>
        <h3 className={styles.title}>{title}</h3>
      </div>
      <div className={styles.value}>{value}</div>
      <p className={styles.description}>{description}</p>
    </Card>
  );
};