import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { getCurrentUser, refreshToken } from '../services/api';
// import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext();     // Создаем контекст для аутентификации

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(false);                      // Состояние аутентификации пользователя
  const [showLoginModal, setShowLoginModal] = useState(false)   // Состояние модального окна входа
  const [initInitialize, setInitInitialize] = useState(true)    // Состояние инициализации (чтобы знать, когда первая проверка завершена)
  const [usrData, setUsrData] = useState(null);                 // Данные пользователя
  const [tokenCheckTimer, setTokenCheckTimer] = useState(null); // Таймер для проверки токена
  const [loading, setLoading] = useState(false);                // Загрузка данных зарегистрированног пользоваьеля
  const [error, setError] = useState(null);                     // 

  // Функция для декодирования JWT токена (без проверки подписи)
  const decodeToken = useCallback((token) => {
    if (!token) return null;
    try {      
      // JWT состоит из 3 частей, разделенных точками. Нам нужна вторая часть (payload)
      const base64Url = token.split('.')[1];
      // Заменяем символы, чтобы корректно декодировать base64
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      // Декодируем и парсим JSON
      return JSON.parse(window.atob(base64));
    } catch (error) {
      console.error('AuthContext-decodeToken-Ошибка декодирования токена->', error.response?.data || error.message);
      return null;
    }
  },[]);

  // Функция для получения времени истечения токена
  const getTokenExpiration = useCallback((token) => {
    const decoded = decodeToken(token);
    // В JWT время истечения хранится в поле 'exp' в секундах
    //if (!decoded || !decoded.exp) return null;
    // Конвертируем в миллисекунды    
    return decoded?.exp ? decoded.exp * 1000 : null;
  }, [decodeToken]);

  // Функция проверки, истек ли токен
  const isTokenExpired = useCallback((token) => {
    const expiration = getTokenExpiration(token);    
    return expiration ? Date.now() > expiration : true;
  }, [getTokenExpiration]);

  // Функция проверки, нужно ли обновлять токен (за минуту до истечения)
  const shouldRefreshToken = useCallback((token) => {
    const expiration = getTokenExpiration(token);    
    // Проверяем, осталось ли меньше минуты до истечения
    return expiration ? (expiration - Date.now()) < 60000 : false;
  }, [getTokenExpiration]);

   // Функция выхода из системы
  const logout =  useCallback((callback) => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setAuth(false); 
    setUsrData(null);
    setError(null);
    // Очищаем таймер проверки токена
    if (tokenCheckTimer) {
      clearInterval(tokenCheckTimer);
      setTokenCheckTimer(null);
    }
    if (callback && typeof callback === 'function') {
      callback();
    }
  }, [tokenCheckTimer]);

  // Функция для получения данных пользователя
  const fetchUsrData = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      // Если токена нет, устанавливаем состояние неаутентифицированным
      setAuth(false);
      setUsrData(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      // Запрашиваем данные пользователя с текущим токеном
      const userData = await getCurrentUser();
      setAuth(true);
      setUsrData(userData.data);
      
      // Проверяем, нужно ли обновить токен
      if (shouldRefreshToken(token)) {
        await handleTokenRefresh();
      }
    } catch (error) {
      console.error('AuthContext-fetchUsrData-Ошибка проверки токена->', error.response?.data || error.message);
      setError(error.message || 'Ошибка аутенфикации');
      logout();
    } finally {
      setLoading(false)
      // После первой проверки отмечаем, что инициализация завершена
      if (initInitialize) {
        setInitInitialize(false);
      }
    }
  }, [initInitialize, shouldRefreshToken, auth]);

  // Функция для обновления токена
  const handleTokenRefresh = useCallback(async () => {
    const refreshTokenValue = localStorage.getItem('refresh_token');
    if (!refreshTokenValue || isTokenExpired(refreshToken)) {
      // Если нет refresh токена, разлогиниваем пользователя
      logout();
      return;
    }

    try {
      // Вызываем API для обновления токена
      const response = await refreshToken(refreshTokenValue);
      // Сохраняем новый access токен
      localStorage.setItem('access_token', response.access_token);
      // Если в ответе есть новый refresh токен, сохраняем и его
      if (response.refresh_token) {
        localStorage.setItem('refresh_token', response.refresh_token);
      }
      // Обновляем состояние аутентификации
      setAuth(true);
      // Запрашиваем данные пользователя с новым токеном
      await fetchUsrData();
    } catch (error) {
      console.error('AuthContext-handleRefreshToken-Ошибка обновления токена->', error.response?.data || error.message);
      // Если не удалось обновить, разлогиниваем пользователя
      logout();
    }
  }, [fetchUsrData, logout, isTokenExpired]);
 
  useEffect(() => {
    const initAuth = async () => {
      await fetchUsrData();      
      console.log("AuthContext--Auth initilized-usrData->", usrData);
    }    
    initAuth();

    let retryCount = 0;
    const maxRetryCount = 5;
    const baseDelay = 30000;

    const checkToken = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      try {
        if (shouldRefreshToken(token)) {
          await handleTokenRefresh();
          retryCount = 0;
        } else if (isTokenExpired(token)) {
          logout();
        }
      }
      catch (error) {
        retryCount++;
        if (retryCount > maxRetryCount) {
          logout();
          retryCount = 0;
        }
        const delay = Math.min(baseDelay * Math.pow(2, retryCount), 300000);
        setTimeout(checkToken, delay);
        return;
      }
      finally {}
      setTimeout(checkToken, baseDelay);
    }

    // const timerId = setTimeout(checkToken, baseDelay);
    const timerId = setInterval(checkToken, baseDelay);
    return () => clearTimeout(timerId);
  }, [fetchUsrData, handleTokenRefresh, isTokenExpired, logout, shouldRefreshToken]);

  // Эффект для обновления данных пользователя при изменении состояния аутентификации
  useEffect(() => {
    if (auth && ! usrData) {
      fetchUsrData().catch((err) => {
        console.error("AuthContext--useEffect[auth]--Ошибка при получении данных пользователя->", err.response?.data || err.message);
        setError(err.message || 'Не удалось получить данные');
      });
    }
  }, [auth, usrData]);

// // Функция для получения данных пользователя
//   const fetchUsrData = async () => {
//     const token = localStorage.getItem('access_token');
//     if (!token) {
//       // Если токена нет, устанавливаем состояние неаутентифицированным
//       setAuth(false);
//       setUsrData(null);
//       return;
//     }

//     try {
//       setLoading(true);
//       setError(null);
//       // Запрашиваем данные пользователя с текущим токеном
//       const userData = await getCurrentUser();
//       setAuth(true);
//       setUsrData(userData.data);
      
//       // Проверяем, нужно ли обновить токен
//       if (shouldRefreshToken(token)) {
//         await handleTokenRefresh();
//       }
//     } catch (error) {
//       console.error('AuthContext-fetchUsrData-Ошибка проверки токена->', error);
//       setError(error.message || 'Ошибка аутенфикации');
//       logout();
//     } finally {
//       setLoading(false)
//       // После первой проверки отмечаем, что инициализация завершена
//       if (initInitialize) {
//         setInitInitialize(false);
//       }
//     }
//   };
  
// // Функция для декодирования JWT токена (без проверки подписи)
//   const decodeToken = (token) => {
//     try {
//       if (!token) return null;
//       // JWT состоит из 3 частей, разделенных точками. Нам нужна вторая часть (payload)
//       const base64Url = token.split('.')[1];
//       // Заменяем символы, чтобы корректно декодировать base64
//       const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//       // Декодируем и парсим JSON
//       return JSON.parse(window.atob(base64));
//     } catch (error) {
//       console.error('Ошибка декодирования токена:', error);
//       return null;
//     }
//   };

  // // Функция для получения времени истечения токена
  // const getTokenExpiration = (token) => {
  //   const decoded = decodeToken(token);
  //   // В JWT время истечения хранится в поле 'exp' в секундах
  //   if (!decoded || !decoded.exp) return null;
  //   // Конвертируем в миллисекунды
  //   return decoded.exp * 1000;
  // };

  // // Функция проверки, истек ли токен
  // const isTokenExpired = (token) => {
  //   const expiration = getTokenExpiration(token);
  //   if (!expiration) return true;
  //   return Date.now() > expiration;
  // };

  // // Функция проверки, нужно ли обновлять токен (за минуту до истечения)
  // const shouldRefreshToken = (token) => {
  //   const expiration = getTokenExpiration(token);
  //   if (!expiration) return false;
  //   // Проверяем, осталось ли меньше минуты до истечения
  //   return (expiration - Date.now()) < 60000;
  // };

  // // Функция для обновления токена
  // const handleTokenRefresh = useCallback(async () => {
  //   const refreshTokenValue = localStorage.getItem('refresh_token');
  //   if (!refreshTokenValue) {
  //     // Если нет refresh токена, разлогиниваем пользователя
  //     logout();
  //     return;
  //   }

  //   try {
  //     // Вызываем API для обновления токена
  //     const response = await refreshToken(refreshTokenValue);
  //     // Сохраняем новый access токен
  //     localStorage.setItem('access_token', response.access_token);
  //     // Если в ответе есть новый refresh токен, сохраняем и его
  //     if (response.refresh_token) {
  //       localStorage.setItem('refresh_token', response.refresh_token);
  //     }
  //     // Обновляем состояние аутентификации
  //     setAuth(true);
  //     // Запрашиваем данные пользователя с новым токеном
  //     await fetchUsrData();
  //   } catch (error) {
  //     console.error('Ошибка обновления токена:', error);
  //     // Если не удалось обновить, разлогиниваем пользователя
  //     logout();
  //   }
  // }, [fetchUsrData]);

  // // Функция выхода из системы
  // const logout =  useCallback((callback) => {
  //   localStorage.removeItem('access_token');
  //   localStorage.removeItem('refresh_token');
  //   setAuth(false); 
  //   setUsrData(null);
  //   setError(null);
  //   // Очищаем таймер проверки токена
  //   if (tokenCheckTimer) {
  //     clearInterval(tokenCheckTimer);
  //     setTokenCheckTimer(null);
  //   }
  //   if (callback && typeof callback === 'function') {
  //     callback();
  //   }
  // }, [tokenCheckTimer]);

  const contextValue = useMemo(() => ({
    auth,
    setAuth,
    loading,
    error,
    usrData,
    setUsrData,
    showLoginModal,
    setShowLoginModal,
    logout,
    refreshToken: handleTokenRefresh
  }), [ auth, loading, error, usrData, showLoginModal, logout, handleTokenRefresh ]);
 
  return (
    <AuthContext.Provider value={ contextValue }>
      {children}
    </AuthContext.Provider>
  );

  // return (
  //   <AuthContext.Provider value={{ 
  //     auth,
  //     setAuth, 
  //     showLoginModal, 
  //     setShowLoginModal,
  //     usrData,
  //     logout // функция выхода в контекст
  //   }}>
  //     {children}
  //   </AuthContext.Provider>
  // );
};

// Добавляем кастомный хук для удобства использования
export const useAuth = () => {
  return useContext(AuthContext);
};