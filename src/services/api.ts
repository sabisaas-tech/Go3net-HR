const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async handleResponse(response: Response) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }
    return response.json();
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return this.handleResponse(response);
  }

  async register(userData: any) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return this.handleResponse(response);
  }

  async getMe() {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Role endpoints
  async getMyRoles() {
    const response = await fetch(`${API_BASE_URL}/roles/my-roles`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getRoleHierarchy() {
    const response = await fetch(`${API_BASE_URL}/roles/hierarchy`);
    return this.handleResponse(response);
  }

  async assignRole(userId: string, roleName: string) {
    const response = await fetch(`${API_BASE_URL}/roles/assign`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ userId, roleName }),
    });
    return this.handleResponse(response);
  }

  // Employee endpoints
  async getEmployees() {
    const response = await fetch(`${API_BASE_URL}/employees`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async createEmployee(employeeData: any) {
    const response = await fetch(`${API_BASE_URL}/employees`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(employeeData),
    });
    return this.handleResponse(response);
  }

  async updateEmployee(id: string, employeeData: any) {
    const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(employeeData),
    });
    return this.handleResponse(response);
  }

  async deleteEmployee(id: string) {
    const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getEmployeeStatistics() {
    const response = await fetch(`${API_BASE_URL}/employees/statistics`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Task endpoints
  async getTasks() {
    const response = await fetch(`${API_BASE_URL}/tasks/my-tasks`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async createTask(taskData: any) {
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(taskData),
    });
    return this.handleResponse(response);
  }

  async updateTask(id: string, taskData: any) {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(taskData),
    });
    return this.handleResponse(response);
  }

  async updateTaskStatus(id: string, status: string) {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}/status`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    return this.handleResponse(response);
  }

  async getTaskStatistics() {
    const response = await fetch(`${API_BASE_URL}/tasks/statistics`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Time tracking endpoints
  async getTimeTracking() {
    const response = await fetch(`${API_BASE_URL}/time-tracking/my-entries`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async createTimeEntry(timeData: any) {
    const response = await fetch(`${API_BASE_URL}/time-tracking`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(timeData),
    });
    return this.handleResponse(response);
  }

  // Notification endpoints
  async getNotifications() {
    const response = await fetch(`${API_BASE_URL}/notifications`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async markNotificationAsRead(id: string) {
    const response = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }
}

export const apiService = new ApiService();