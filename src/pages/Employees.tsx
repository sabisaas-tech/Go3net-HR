import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { DashboardLayout } from '../components/Dashboard/DashboardLayout';
import { showToast } from '../services/toastService';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

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
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="text-6xl opacity-50">🚫</div>
            <h3 className="text-xl font-semibold text-foreground">Access Denied</h3>
            <p className="text-muted-foreground">You don't have permission to view employee information.</p>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-start mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Employees</h1>
            <p className="text-muted-foreground">Manage and view employee information</p>
          </div>
          <div className="flex gap-4 items-center">
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48 text-muted-foreground">Loading employees...</div>
        ) : filteredEmployees.length === 0 ? (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <div className="text-6xl opacity-50">👥</div>
              <h3 className="text-xl font-semibold text-foreground">No employees found</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'No employees match your search criteria.'
                  : 'No employees have been added to the system yet.'
                }
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {filteredEmployees.map((employee) => (
              <Card key={employee.id} className="p-6 transition-all hover:shadow-md hover:-translate-y-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-lg">
                    {employee.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">{employee.fullName}</h3>
                    <p className="text-sm text-muted-foreground">ID: {employee.employeeId}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-md ${getStatusColor(employee.accountStatus)}`}>
                    {employee.accountStatus}
                  </span>
                </div>
                
                <div className="space-y-3 p-4 bg-muted/10 rounded-lg mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Email:</span>
                    <span className="text-sm text-foreground">{employee.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Role:</span>
                    <span className="text-sm text-foreground">{employee.role}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Joined:</span>
                    <span className="text-sm text-foreground">
                      {new Date(employee.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
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

        <div className="flex justify-center py-4 border-t text-sm text-muted-foreground">
          <p>Showing {filteredEmployees.length} of {employees.length} employees</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Employees;