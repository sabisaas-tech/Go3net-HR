import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { DashboardLayout } from '../components/Dashboard/DashboardLayout';
import { showToast } from '../services/toastService';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import styles from './Employees.module.css';

interface Employee {
  id: string;
  email: string;
  fullName: string;
  employeeId: string;
  accountStatus: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

const Employees = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await apiService.getEmployees();
        setEmployees(response.data || []);
      } catch (error: any) {
        console.error('Failed to fetch employees:', error);
        showToast.error('Failed to load employees', error.message);
      } finally {
        setLoading(false);
      }
    };

    if (user?.permissions.includes('employee.read') || user?.permissions.includes('*')) {
      fetchEmployees();
    } else {
      setLoading(false);
    }
  }, [user]);

  const filteredEmployees = employees.filter(employee =>
    employee.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!user) return null;

  const canViewEmployees = user.permissions.includes('employee.read') || 
                           user.permissions.includes('*');

  if (!canViewEmployees) {
    return (
      <DashboardLayout>
        <Card className={styles.accessDenied}>
          <div className={styles.accessDeniedContent}>
            <div className={styles.accessDeniedIcon}>🚫</div>
            <h3>Access Denied</h3>
            <p>You don't have permission to view employee information.</p>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1>Employees</h1>
            <p>Manage and view employee information</p>
          </div>
          <div className={styles.headerActions}>
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading employees...</div>
        ) : filteredEmployees.length === 0 ? (
          <Card className={styles.emptyState}>
            <div className={styles.emptyContent}>
              <div className={styles.emptyIcon}>👥</div>
              <h3>No employees found</h3>
              <p>
                {searchTerm 
                  ? 'No employees match your search criteria.'
                  : 'No employees have been added to the system yet.'
                }
              </p>
            </div>
          </Card>
        ) : (
          <div className={styles.employeesGrid}>
            {filteredEmployees.map((employee) => (
              <Card key={employee.id} className={styles.employeeCard}>
                <div className={styles.employeeHeader}>
                  <div className={styles.employeeAvatar}>
                    {employee.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div className={styles.employeeInfo}>
                    <h3 className={styles.employeeName}>{employee.fullName}</h3>
                    <p className={styles.employeeId}>ID: {employee.employeeId}</p>
                  </div>
                  <span className={`${styles.badge} ${getStatusColor(employee.accountStatus)}`}>
                    {employee.accountStatus}
                  </span>
                </div>
                
                <div className={styles.employeeDetails}>
                  <div className={styles.detail}>
                    <span className={styles.detailLabel}>Email:</span>
                    <span className={styles.detailValue}>{employee.email}</span>
                  </div>
                  <div className={styles.detail}>
                    <span className={styles.detailLabel}>Role:</span>
                    <span className={styles.detailValue}>{employee.role}</span>
                  </div>
                  <div className={styles.detail}>
                    <span className={styles.detailLabel}>Joined:</span>
                    <span className={styles.detailValue}>
                      {new Date(employee.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className={styles.employeeActions}>
                  <Button size="sm" variant="outline">
                    View Profile
                  </Button>
                  {(user.permissions.includes('employee.update') || user.permissions.includes('*')) && (
                    <Button size="sm">
                      Edit
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className={styles.summary}>
          <p>Showing {filteredEmployees.length} of {employees.length} employees</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Employees;