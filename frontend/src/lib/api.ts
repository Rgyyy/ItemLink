const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getHeaders(includeAuth: boolean = false): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    includeAuth: boolean = false
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = this.getHeaders(includeAuth);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth endpoints
  async sendVerificationCode(email: string) {
    return this.request('/api/auth/send-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyEmailCode(email: string, code: string) {
    return this.request('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  }

  async register(userData: {
    email: string;
    username: string;
    password: string;
    fullName: string;
    phone?: string;
  }) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials: { email: string; password: string }) {
    return this.request<{ success: boolean; token: string; user: any }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(credentials),
      }
    );
  }

  async getProfile() {
    return this.request('/api/auth/profile', {}, true);
  }

  async updateProfile(profileData: {
    username?: string;
    fullName?: string;
    phone?: string;
    avatarUrl?: string;
  }) {
    return this.request('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }, true);
  }

  async changePassword(passwordData: {
    currentPassword: string;
    newPassword: string;
  }) {
    return this.request('/api/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    }, true);
  }

  async deleteAccount(password: string) {
    return this.request('/api/auth/delete-account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }, true);
  }

  // Trade endpoints
  async getTrades(params?: {
    boardType?: string;
    gameCategory?: string;
    itemType?: string;
    tradeType?: string;
    status?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
  }) {
    const queryString = params
      ? '?' + new URLSearchParams(params as any).toString()
      : '';
    return this.request(`/api/trades${queryString}`);
  }

  async getTradeById(tradeId: string) {
    return this.request(`/api/trades/${tradeId}`);
  }

  async createTrade(tradeData: {
    gameCategory: string;
    title: string;
    description: string;
    tradeType?: string;
    images?: string[];
  }) {
    return this.request(
      '/api/trades',
      {
        method: 'POST',
        body: JSON.stringify(tradeData),
      },
      true
    );
  }

  async updateTrade(tradeId: string, tradeData: Partial<any>) {
    return this.request(
      `/api/trades/${tradeId}`,
      {
        method: 'PUT',
        body: JSON.stringify(tradeData),
      },
      true
    );
  }

  async deleteTrade(tradeId: string) {
    return this.request(
      `/api/trades/${tradeId}`,
      {
        method: 'DELETE',
      },
      true
    );
  }

  // 이미지 업로드 (단일)
  async uploadTradeImage(imageFile: File): Promise<{ success: boolean; data: { imageUrl: string } }> {
    const formData = new FormData();
    formData.append('image', imageFile);

    const token = localStorage.getItem('token');
    const response = await fetch(`${this.baseURL}/api/trades/upload/image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Failed to upload image');
    }

    return data;
  }

  // 이미지 업로드 (다중)
  async uploadTradeImages(imageFiles: File[]): Promise<{ success: boolean; data: { imageUrls: string[] } }> {
    const formData = new FormData();
    imageFiles.forEach((file) => {
      formData.append('images', file);
    });

    const token = localStorage.getItem('token');
    const response = await fetch(`${this.baseURL}/api/trades/upload/images`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Failed to upload images');
    }

    return data;
  }

  // Comment endpoints
  async createComment(commentData: {
    tradeId: string;
    content: string;
  }) {
    return this.request(
      '/api/comments',
      {
        method: 'POST',
        body: JSON.stringify(commentData),
      },
      true
    );
  }

  async getCommentsByTradeId(tradeId: string, params?: { page?: number; limit?: number }) {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/api/comments/trade/${tradeId}${queryString}`);
  }

  async updateComment(commentId: string, content: string) {
    return this.request(
      `/api/comments/${commentId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ content }),
      },
      true
    );
  }

  async deleteComment(commentId: string) {
    return this.request(
      `/api/comments/${commentId}`,
      {
        method: 'DELETE',
      },
      true
    );
  }

  // Message endpoints
  async sendMessage(messageData: {
    transactionId: string;
    receiverId: string;
    content: string;
  }) {
    return this.request(
      '/api/messages',
      {
        method: 'POST',
        body: JSON.stringify(messageData),
      },
      true
    );
  }

  async getMessages(transactionId: string) {
    return this.request(`/api/messages/transaction/${transactionId}`, {}, true);
  }

  async getUnreadCount() {
    return this.request('/api/messages/unread-count', {}, true);
  }

  async markMessageAsRead(messageId: string) {
    return this.request(
      `/api/messages/${messageId}/read`,
      {
        method: 'PATCH',
      },
      true
    );
  }

  // Report endpoints
  async createReport(reportData: {
    reportedUserId: string;
    transactionId?: string;
    type: string;
    reason: string;
    evidence?: string;
  }) {
    return this.request(
      '/api/reports',
      {
        method: 'POST',
        body: JSON.stringify(reportData),
      },
      true
    );
  }

  async getMyReports(params?: { status?: string; page?: number; limit?: number }) {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/api/reports/my${queryString}`, {}, true);
  }

  async getReportById(reportId: string) {
    return this.request(`/api/reports/${reportId}`, {}, true);
  }

  // Admin endpoints
  async getAdminDashboardStats() {
    return this.request('/api/admin/dashboard/stats', {}, true);
  }

  async getAdminUsers(params?: { page?: number; limit?: number; search?: string; role?: string }) {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/api/admin/users${queryString}`, {}, true);
  }

  async updateAdminUser(userId: string, data: { role?: string; isActive?: boolean; isVerified?: boolean }) {
    return this.request(`/api/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true);
  }

  async deleteAdminUser(userId: string) {
    return this.request(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    }, true);
  }

  async getAdminTrades(params?: { page?: number; limit?: number; search?: string; status?: string }) {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/api/admin/trades${queryString}`, {}, true);
  }

  async updateAdminTrade(tradeId: string, data: { status?: string }) {
    return this.request(`/api/admin/trades/${tradeId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true);
  }

  async deleteAdminTrade(tradeId: string) {
    return this.request(`/api/admin/trades/${tradeId}`, {
      method: 'DELETE',
    }, true);
  }

  async getAdminTransactions(params?: { page?: number; limit?: number; status?: string }) {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/api/admin/transactions${queryString}`, {}, true);
  }

  async updateAdminTransaction(transactionId: string, data: { status?: string }) {
    return this.request(`/api/admin/transactions/${transactionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true);
  }

  async getAdminReviews(params?: { page?: number; limit?: number }) {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/api/admin/reviews${queryString}`, {}, true);
  }

  async deleteAdminReview(reviewId: string) {
    return this.request(`/api/admin/reviews/${reviewId}`, {
      method: 'DELETE',
    }, true);
  }

  async getAdminReports(params?: { page?: number; limit?: number; status?: string; type?: string }) {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/api/admin/reports${queryString}`, {}, true);
  }

  async processReport(reportId: string, data: { status: string; adminNote: string; banUser?: boolean; banDuration?: number }) {
    return this.request(`/api/admin/reports/${reportId}/process`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, true);
  }
}

export const api = new ApiClient(API_BASE_URL);
