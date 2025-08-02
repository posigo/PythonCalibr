import axios from 'axios';

// const api = axios.create({    
//     baseURL: 'http://localhost:8000/api',
//     withCredentials: true // Для передачи куки и заголовков авторизации
// })
const api = axios.create({    
    // baseURL: 'http://192.168.39.60:2370/api',
    baseURL: 'http://127.0.0.1:8000/api',
    withCredentials: true // Для передачи куки и заголовков авторизации
})



// Добавляем интерцептор для токена
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  const publicEndpoints = ['/token/', '/auth/register/', '/docum_user/download-security-policy/'];
  if (token && !publicEndpoints.includes(config.url)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Аутентификация
export const login = (username, password) => api.post('/token/', { username: username, password: password});
export const refreshToken = (refresh) => api.post('/token/refresh/', { refresh: refresh });
export const logoutUser = (refreshToken) => api.post('/auth/logout/', { refresh: refreshToken });
export const registerUser = (userData) => api.post('/auth/register/', userData);

// Пользователи
export const getUsers = () => api.get('/users/');
export const getUser = (id) => api.get(`/users/${id}/`);
export const getUserName = (id) => api.get(`/users/${id}/get_name_user/`);
// export const getUserNameList = (ids) => api.get('/users/get_name_user_list/', {
//     params: { ids: ids.join(',')}
// });
export const getUserNameList = (idsL) => {
    const ids = idsL.join(',');
    return api.get(`/users/get_name_users_list/?ids=${ids}`);
};
export const getCurrentUser = () => api.get('/users/me/');
export const getVerifiedUsers = () => api.get('/users/verifiedusers/');
export const getUnverifiedUsers = () => api.get('/users/unverifiedusers/');
export const createUser = (userData) => api.post('/users/', userData);
export const assignGroup = (userId, groupName) => api.post(`/users/${userId}/assign_group/`, { group: groupName });
export const changeGroup = (userId, newGroup) => api.post(`/users/${userId}/change_group/`, { new_group: newGroup });
export const updateUser = (id, userData) => api.patch(`/users/${id}/`, userData);
export const updateCurrentUser = (userData) => api.patch('/users/me/', userData);
export const deleteUser = (id) => api.delete(`/users/${id}/`);
export const deleteCurrentUser = () => api.delete('/users/me/');

// Группы
export const getGroups = () => api.get('/groups/');
export const getGroup = (id) => api.get(`/groups/${id}/`);

// Уведомления
export const getNotifications = () => api.get('/notifications/');
export const getNotification = (id) => api.get(`/notifications/${id}/`);
export const createNotification = (notificationData) => api.post('/notifications/', notificationData);
export const updateNotification = (id, notificationData) => api.patch(`/notifications/${id}/`, notificationData);
export const deleteNotification = (id) => api.delete(`/notifications/${id}/`);

export const getNotificationBySender = () => api.get('/notifications/by_sender/');
export const getNotificationByRecepient = () => api.get('/notifications/by_recipient/');
export const getNotificationIdMark = (id) => api.get(`/notifications/${id}/mark_as_read/`);

// История действий
export const getActionHistory = (params = {}) => api.get('/history/', { params });
export const getActiveActionHistory = (params = {}) => api.get('/action-history/active/', { params });
export const getDeletedActionHistory = (params = {}) => api.get('/action-history/deleted/', { params });
export const getActionHistoryById = (id) => api.get(`/action-history/${id}/`);
// Мягкое удаление (помечает is_deleted=true)
export const softDeleteActionHistory = (id) => api.delete(`/action-history/${id}/`);
// Физическое удаление записи (только для is_deleted=true)
export const hardDeleteActionHistory = (id) => api.delete(`/action-history/${id}/hard-delete/`);
// Восстановление записи (устанавливает is_deleted=false)
export const restoreActionHistory = (id) => api.patch(`/action-history/${id}/restore/`);

export default api;

// Функция для установки токена в заголовки
const setAuthToken = (token) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
};

export const getCalculations = () => api.get('/calculations/');
export const getCalculationsUsers = () => api.get('/calculations/calculationsusers/');
export const getCalculation = (id) => api.get(`/calculations/${id}/`);
export const getUncertainty = (id, valueSubstance, numberMeasure) => {
    return api.get(`/calculations/${id}/uncertainty?valueSubstance=${valueSubstance}&numberMeasure=${numberMeasure}`)
}
export const createCalculation = (calculation) => api.post('/calculations/', calculation)
export const updateCalculation = (id, calculation) => api.put(`/calculations/${id}/`, calculation)
export const deleteCalculation = (id) => api.delete(`/calculations/${id}/`)
export const exportCalculationTo = (id, type, params={}) => {
  const queryString = Object.keys(params).length 
    ? `?${new URLSearchParams(params).toString()}` 
    : '';
  return api.get(`/calculations/${id}/export/${type}/${queryString}`, {responseType: 'blob'});
}

export const getSolutions = () => api.get('/solutions/');
export const getSolution = (id) => api.get(`/solutions/${id}/`);
export const getSolutionsByCalculation = (id) => api.get(`/solutions/by-calculation/${id}/`);
export const createSolution = (solution) => api.post('/solutions/', solution);
export const updateSolution = (id, solution) => api.put(`/solutions/${id}/`, solution);
export const deleteSolution = (id) => api.delete(`/solutions/${id}/`);

export const getOpticalDensities = () => api.get('/opticaldensities/');
export const getOpticalDensity = (id) => api.get(`/opticaldensities/${id}/`);
export const createOpticalDensity = (opticalDensity) => api.post('/opticaldensities/', opticalDensity);
export const updateOpticalDensity = (id, opticalDensity) => api.put(`/opticaldensities/${id}/`, opticalDensity);
export const deleteOpticalDensity = (id) => api.delete(`/opticaldensities/${id}/`);

// Для загрузки данных при редактировании
export const fetchCalculation = (id) => {
    return api.get(`/calculations/${id}/`);
};

// Получить все растворы для расчета
export const getCalcSolutions = async (calculationId) => {
    try {
        const baseURL = 'http://localhost:8000/api';
        const response = await axios.get(`${baseURL}/calculations/${calculationId}`);
        //const response = await getCalculation(calculationId);

        const ddata =  (response.data);

        console.log("api -- Request config:", response.config);
        console.log("Response status:", response.status);
        console.log("api -- ", `${baseURL}/calculations/${calculationId}`)
        console.log("api -- ", response);
        console.log("api -- ", response.data);
        console.log("api calculation -- ", ddata);
        console.log("api -- ", response.data.calculation_solutions);
        return response.data.calculation_solutions;
    }
    catch (error) {
        console.error("Error fetching calc_solutions: ", error);
        throw error;
    };
};

// Обновить раствор и его оптические плотности
export const updateCalcSolution = async (solutionId, solutionData, opticalDensities) => {
    try {
        // Обновляем сам раствор
        await updateSolution(solutionId, solutionData);

        // Обновляем оптические плотности
        const baseURL = 'http://localhost:8000/api';
        const updatePromises = opticalDensities.map(od =>
            axios.put(`${baseURL}/optical-densities/${od.id}/`, od)
        );

        await Promise.all(updatePromises);
    } catch (error) {
        console.error("Error updating solution:", error);
        throw error;
    }
};

// Удалить раствор и его оптические плотности
export const deleteCalcSolution = async (solutionId) => {
    try {
        const baseURL = 'http://localhost:8000/api';
        await axios.delete(`${baseURL}/solutions/${solutionId}/`);
    } catch (error) {
        console.error("Error deleting solution:", error);
        throw error;
    }
};

export const getHelpCalibrationPDF = () => 
  api.get('/docum-user/download-help-pdf/', {
    responseType: 'blob'
  });

export const getSecurityPolicy = () => 
  api.get('/docum-user/download-security-policy/');

export const getAsutpInfo = () => 
  api.get('/docum-user/download-asutp/');