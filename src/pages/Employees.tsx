import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/Dashboard/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Plus, Search, Mail, Phone, MapPin } from 'lucide-react';
import styles from './Employees.module.css';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  status: string;
  hireDate: string;
}

const Employees = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const response = await apiService.getEmployees();
      setEmployees(response.data || []);
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEmployees = employees.filter(employee =>
    `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-500';
      case 'inactive': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const canManageEmployees = user?.permissions.includes('employee.create') || user?.permissions.includes('employee.update');

  if (!user) return null;

  return (
    <DashboardLayout 
      userRole={user.role} 
      userName={`${user.firstName} ${user.lastName}`}
      userEmail={user.email}
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Employees</h1>
          {canManageEmployees && (
            <Button className={styles.addButton}>
              <Plus size={18} />
              Add Employee
            </Button>
          )}
        </div>

        <div className={styles.searchContainer}>
          <Search size={18} className={styles.searchIcon} />
          <Input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {isLoading ? (
          <div className={styles.loading}>Loading employees...</div>
        ) : filteredEmployees.length === 0 ? (
          <Card className={styles.emptyState}>
            <h3>No employees found</h3>
            <p>No employees match your search criteria.</p>
          </Card>
        ) : (
          <div className={styles.employeeGrid}>
            {filteredEmployees.map(employee => (
              <Card key={employee.id} className={styles.employeeCard}>
                <div className={styles.employeeHeader}>
                  <div className={styles.avatar}>
                    {employee.firstName[0]}{employee.lastName[0]}
                  </div>
                  <div className={styles.employeeInfo}>
                    <h3>{employee.firstName} {employee.lastName}</h3>
                    <p className={styles.position}>{employee.position}</p>
                    <Badge className={`${styles.statusBadge} ${getStatusColor(employee.status)}`}>
                      {employee.status}
                    </Badge>
                  </div>
                </div>

                <div className={styles.employeeDetails}>
                  <div className={styles.detailItem}>
                    <Mail size={16} />
                    <span>{employee.email}</span>
                  </div>
                  {employee.phone && (
                    <div className={styles.detailItem}>
                      <Phone size={16} />
                      <span>{employee.phone}</span>
                    </div>
                  )}
                  <div className={styles.detailItem}>
                    <MapPin size={16} />
                    <span>{employee.department}</span>
                  </div>
                </div>

                <div className={styles.employeeMeta}>
                  <span>Hired: {new Date(employee.hireDate).toLocaleDateString()}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Employees;