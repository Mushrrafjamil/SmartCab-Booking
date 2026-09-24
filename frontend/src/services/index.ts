import api from './api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const authService = {
  register: (formData: FormData) =>
    api.post('/auth/register', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  registerDriverStep: (step: number, formData: FormData) =>
    api.post(`/auth/register/driver/step/${step}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  login: (data: { email?: string; phone?: string; password: string }) =>
    api.post('/auth/login', data),

  sendLoginOtp: (phone: string) =>
    api.post('/auth/login/otp', { phone }),

  loginWithOtp: (data: { phone: string; otp: string }) =>
    api.post('/auth/login/otp/verify', data),

  verifyOtp: (data: { email?: string; phone?: string; otp: string; type: string }) =>
    api.post('/auth/verify-otp', data),

  resendOtp: (data: { email?: string; phone?: string; type: string }) =>
    api.post('/auth/resend-otp', data),

  forgotPassword: (data: { email?: string; phone?: string }) =>
    api.post('/auth/forgot-password', data),

  resetPassword: (data: object) =>
    api.post('/auth/reset-password', data),

  logout: (token: string, allDevices = false) =>
    api.post('/auth/logout', { token, allDevices }),

  refresh: (token: string) =>
    api.post('/auth/refresh', { token }),

  getSessions: () => api.get('/auth/sessions'),
  revokeSession: (id: string) => api.delete(`/auth/sessions/${id}`),
  getLoginHistory: () => api.get('/auth/login-history'),
};

export const userService = {
  getDashboard: () => api.get('/users/dashboard'),
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: { name: string }) => api.put('/users/profile', data),
  uploadProfilePhoto: (formData: FormData) =>
    api.post('/users/profile/photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  removeProfilePhoto: () => api.delete('/users/profile/photo'),
  requestPhoneUpdateOtp: (phone: string) => api.post('/users/profile/phone/request-otp', { phone }),
  updatePhone: (data: { phone: string; otp: string }) => api.put('/users/profile/phone', data),
  requestEmailUpdateOtp: (email: string) => api.post('/users/profile/email/request-otp', { email }),
  updateEmail: (data: { email: string; otp: string }) => api.put('/users/profile/email', data),
  changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    api.put('/users/change-password', data),
  getRideHistory: (status?: string) => api.get('/rides/history', { params: { status } }),
  getSavedLocations: () => api.get('/users/locations'),
  addSavedLocation: (data: object) => api.post('/users/locations', data),
  deleteSavedLocation: (id: string) => api.delete(`/users/locations/${id}`),
  getEmergencyContacts: () => api.get('/users/emergency'),
  addEmergencyContact: (data: { name: string; phone: string; relation: string; isPrimary?: boolean }) =>
    api.post('/users/emergency', data),
  updateEmergencyContact: (id: string, data: { name?: string; phone?: string; relation?: string }) =>
    api.put(`/users/emergency/${id}`, data),
  setPrimaryEmergencyContact: (id: string) => api.put(`/users/emergency/${id}/primary`),
  deleteEmergencyContact: (id: string) => api.delete(`/users/emergency/${id}`),
};

export const addressService = {
  list: (params?: { type?: string; favorites?: boolean; recent?: boolean }) =>
    api.get('/addresses', { params }),
  getRecommendations: () => api.get('/addresses/recommendations'),
  get: (id: string) => api.get(`/addresses/${id}`),
  create: (data: object) => api.post('/addresses', data),
  update: (id: string, data: object) => api.put(`/addresses/${id}`, data),
  delete: (id: string) => api.delete(`/addresses/${id}`),
  setDefault: (id: string, role: 'general' | 'pickup' | 'drop' = 'general') =>
    api.put(`/addresses/${id}/default`, { role }),
  toggleFavorite: (id: string) => api.put(`/addresses/${id}/favorite`),
  recordUsage: (id: string) => api.put(`/addresses/${id}/use`),
  verify: (id: string) => api.put(`/addresses/${id}/verify`),
  share: (id: string) => api.get(`/addresses/${id}/share`),
  search: (q: string) => api.get('/addresses/search', { params: { q } }),
  reverseGeocode: (lat: number, lng: number) => api.post('/addresses/geocode', { lat, lng }),
  detectGps: (lat: number, lng: number, accuracy?: number) =>
    api.post('/addresses/gps/detect', { lat, lng, accuracy }),
  saveGps: (data: object) => api.post('/addresses/gps/save', data),
  getGpsHistory: () => api.get('/addresses/gps/history'),
  getLastKnown: () => api.get('/addresses/gps/last-known'),
  calculateRoute: (fromLat: number, fromLng: number, toLat: number, toLng: number) =>
    api.get('/addresses/route', { params: { fromLat, fromLng, toLat, toLng } }),
};

export const driverService = {
  getDashboard: () => api.get('/drivers/dashboard'),
  getProfile: () => api.get('/drivers/profile'),
  toggleOnline: () => api.put('/drivers/online-status'),
  updateStatus: (status: string) => api.put('/drivers/status', { status }),
  updateLocation: (data: { lat: number; lng: number }) => api.put('/drivers/location', data),
  getRideRequests: () => api.get('/drivers/requests'),
  acceptRide: (rideId: string) => assignmentService.acceptRide(rideId),
  rejectRide: (rideId: string, reason?: string) => assignmentService.rejectRide(rideId, reason),
  getEarnings: (period?: string) => api.get('/drivers/earnings', { params: { period } }),
  getDocuments: () => api.get('/drivers/documents'),
  uploadDocument: (docType: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/drivers/documents/${docType}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteDocument: (docType: string) => api.delete(`/drivers/documents/${docType}`),
};

export const assignmentService = {
  getPendingForDriver: () => api.get('/assignments/driver/pending'),
  acceptRide: (rideId: string) => api.post(`/assignments/rides/${rideId}/accept`),
  rejectRide: (rideId: string, reason?: string) => api.post(`/assignments/rides/${rideId}/reject`, { reason }),
  searchDrivers: (rideId: string, params?: object) =>
    api.get(`/assignments/rides/${rideId}/drivers`, { params }),
  autoAssign: (rideId: string) => api.post(`/assignments/rides/${rideId}/auto`),
  manualAssign: (rideId: string, driverId: string) =>
    api.post(`/assignments/rides/${rideId}/manual`, { driverId }),
  reassign: (rideId: string, driverId: string) =>
    api.post(`/assignments/rides/${rideId}/reassign`, { driverId }),
  getHistory: (rideId?: string, params?: object) =>
    rideId
      ? api.get(`/assignments/rides/${rideId}/history`, { params })
      : api.get('/assignments/history', { params }),
  checkDriverAvailability: (driverId: string, params?: object) =>
    api.get(`/assignments/drivers/${driverId}/availability`, { params }),
};

export const rideService = {
  estimateFare: (payload: object) => api.post('/rides/estimate', payload),
  estimateByDistance: (distance: number, duration: number, vehicleType?: string, couponCode?: string) =>
    api.get('/rides/estimate', { params: { distance, duration, vehicleType, couponCode } }),
  getNearbyDrivers: (lat: number, lng: number, vehicleType?: string) =>
    api.get('/rides/nearby-drivers', { params: { lat, lng, vehicleType } }),
  bookRide: (data: object) => api.post('/rides/book', data),
  getRide: (id: string) => api.get(`/rides/${id}`),
  trackRide: (id: string) => api.get(`/rides/${id}/track`),
  cancelRide: (id: string, reason?: string) => api.post(`/rides/${id}/cancel`, { reason }),
  updateScheduledRide: (id: string, data: object) => api.put(`/rides/${id}/schedule`, data),
  getInvoice: (id: string, format?: 'html') =>
    api.get(`/rides/${id}/invoice`, { params: format ? { format } : {}, responseType: format === 'html' ? 'text' : 'json' }),
  shareRide: (id: string) => api.get(`/rides/${id}/share`),
  acceptRide: (rideId: string) => api.post(`/rides/${rideId}/accept`),
  updateStatus: (rideId: string, status: string, extra?: object) =>
    api.put(`/rides/${rideId}/status`, { status, ...extra }),
  getActiveRide: () => api.get('/rides/active'),
  getRideHistory: (status?: string) => api.get('/rides/history', { params: status ? { status } : {} }),
  submitRating: (rideId: string, rating: number, comment?: string, issueReported?: boolean) =>
    api.post(`/rides/${rideId}/rate`, { rating, comment, issueReported }),
};

export const walletService = {
  getBalance: () => api.get('/wallet/balance'),
  addMoney: (amount: number) => api.post('/wallet/add', { amount }),
  withdrawMoney: (amount: number) => api.post('/wallet/withdraw', { amount }),
  getTransactions: () => api.get('/wallet/transactions'),
};

export const couponService = {
  getCoupons: () => api.get('/coupons/active'),
  getAllCoupons: () => api.get('/coupons'),
  createCoupon: (data: object) => api.post('/coupons', data),
  updateCoupon: (id: string, data: object) => api.put(`/coupons/${id}`, data),
  deleteCoupon: (id: string) => api.delete(`/coupons/${id}`),
  validateCoupon: (code: string, rideValue?: number) =>
    api.post('/coupons/validate', { code, rideValue }),
};

export const notificationService = {
  getNotifications: (params?: { type?: string; read?: boolean; page?: number }) =>
    api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  deleteNotification: (id: string) => api.delete(`/notifications/${id}`),
  getPreferences: () => api.get('/notifications/preferences'),
  updatePreferences: (data: object) => api.put('/notifications/preferences', data),
  sendPromotional: (data: object) => api.post('/notifications/promotional', data),
};

export const paymentService = {
  getPayments: (params?: object) => api.get('/payments', { params }),
  getPayment: (id: string) => api.get(`/payments/${id}`),
  processPayment: (rideId: string, data?: object) => api.post(`/payments/process/${rideId}`, data),
  retryPayment: (id: string, data?: object) => api.post(`/payments/${id}/retry`, data),
  requestRefund: (id: string, reason?: string) => api.post(`/payments/${id}/refund`, { reason }),
  verifyPayment: (id: string) => api.get(`/payments/${id}/verify`),
  getInvoices: () => api.get('/payments/invoices'),
  getInvoice: (rideId: string, format?: 'html') =>
    api.get(`/payments/invoices/${rideId}`, {
      params: format ? { format } : {},
      responseType: format === 'html' ? 'text' : 'json',
    }),
  emailInvoice: (rideId: string, email?: string) =>
    api.post(`/payments/invoices/${rideId}/email`, { email }),
  getAllPaymentsAdmin: (params?: object) => api.get('/payments/admin/all', { params }),
  processRefundAdmin: (id: string, action: 'approve' | 'reject') =>
    api.put(`/payments/admin/${id}/refund`, { action }),
  createRazorpayOrder: (amount: number, rideId?: string) =>
    api.post('/payments/gateway/razorpay/order', { amount, rideId }),
  verifyRazorpayPayment: (data: object) => api.post('/payments/gateway/razorpay/verify', data),
  createStripeIntent: (amount: number) => api.post('/payments/gateway/stripe/intent', { amount }),
};

export const reportService = {
  getUserReport: (params?: object) => api.get('/reports/users', { params }),
  getDriverReport: (params?: object) => api.get('/reports/drivers', { params }),
  getRideReport: (params?: object) => api.get('/reports/rides', { params }),
  getRevenueReport: (params?: object) => api.get('/reports/revenue', { params }),
  getPaymentReport: (params?: object) => api.get('/reports/payments', { params }),
  getVehicleReport: (params?: object) => api.get('/reports/vehicles', { params }),
  getCouponReport: (params?: object) => api.get('/reports/coupons', { params }),
  getRefundReport: (params?: object) => api.get('/reports/refunds', { params }),
  exportReport: (type: string, params?: object) =>
    api.get(`/reports/${type}`, { params: { ...params, export: 'csv' }, responseType: 'blob' }),
};

export const reviewService = {
  createReview: (data: object) => api.post('/reviews', data),
  getReviews: (params?: object) => api.get('/reviews', { params }),
  getMyReviews: () => api.get('/reviews/mine'),
};

export const analyticsService = {
  getDashboard: () => api.get('/analytics/dashboard'),
};

export const adminService = {
  getStats: () => api.get('/admin/stats'),
  getUsers: () => api.get('/admin/users'),
  searchUsers: (q: string) => api.get('/admin/users/search', { params: { q } }),
  suspendUser: (id: string) => api.put(`/admin/users/${id}/suspend`),
  forceLogout: (id: string) => api.post(`/admin/users/${id}/force-logout`),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  restoreUser: (id: string) => api.put(`/admin/users/${id}/restore`),
  getDrivers: () => api.get('/admin/drivers'),
  createDriver: (data: object) => api.post('/admin/drivers', data),
  getPendingDrivers: () => api.get('/admin/drivers/pending'),
  approveDriver: (id: string, status: string) => api.put(`/admin/drivers/${id}/approve`, { status }),
  reviewDriver: (id: string, status: string, remarks?: string) => api.put(`/admin/drivers/${id}/review`, { status, remarks }),
  getSecurityLogs: () => api.get('/admin/security-logs'),
  getOtpLogs: () => api.get('/admin/otp-logs'),
  getActivityLogs: () => api.get('/admin/activity-logs'),
  getLoginHistory: () => api.get('/admin/login-history'),
  getPendingVehicles: () => api.get('/admin/vehicles/pending'),
  approveVehicle: (id: string, status: string) => api.put(`/admin/vehicles/${id}/approve`, { status }),
  getLiveRides: () => api.get('/admin/rides/live'),
  searchAssignDrivers: (rideId: string, params?: object) =>
    api.get(`/admin/rides/${rideId}/assign/drivers`, { params }),
  autoAssignRide: (rideId: string) => api.post(`/admin/rides/${rideId}/assign/auto`),
  manualAssignRide: (rideId: string, driverId: string) =>
    api.post(`/admin/rides/${rideId}/assign/manual`, { driverId }),
  reassignRide: (rideId: string, driverId: string) =>
    api.post(`/admin/rides/${rideId}/assign/reassign`, { driverId }),
  getAssignmentHistory: (rideId?: string) =>
    rideId
      ? api.get(`/admin/rides/${rideId}/assign/history`)
      : api.get('/admin/assignments/history'),
};

export const vehicleService = {
  getVehicle: () => api.get('/vehicles'),
  createVehicle: (data: object) => api.post('/vehicles', data),
  updateVehicle: (data: object) => api.put('/vehicles', data),
  deleteVehicle: () => api.delete('/vehicles'),
};

export { API_BASE };
