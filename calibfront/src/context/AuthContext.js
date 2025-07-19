import React, { createContext, useState, useEffect, useContext } from 'react';
import { getCurrentUser, refreshToken } from '../services/api';
// import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext();     // Создаем контекст для аутентификации

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(false);                      // Состояние аутентификации пользователя
  const [showLoginModal, setShowLoginModal] = useState(false)   // Состояние модального окна входа
  const [initInitialize, setInitInitialize] = useState(true)    // Состояние инициализации (чтобы знать, когда первая проверка завершена)
  const [usrData, setUsrData] = useState(null);                 // Данные пользователя
  const [tokenCheckTimer, setTokenCheckTimer] = useState(null); // Таймер для проверки токена

  useEffect(() => {
    fetchUsrData()
    console.log("usrData=", usrData);
      // const decoded = jwtDecode(token);
      // setUserData(decoded.user)
      // console.log("decoded=",decoded)

      // Устанавливаем интервал для периодической проверки токена (каждые 30 секунд)
    const timer = setInterval(() => {
      const token = localStorage.getItem('access_token');
      if (token) {
        if (shouldRefreshToken(token)) {
          handleTokenRefresh();
        } else if (isTokenExpired(token)) {
          logout();
        }
      }
    }, 30000);

    setTokenCheckTimer(timer);

    // Очистка интервала при размонтировании компонента
    return () => {
      if (timer) clearInterval(timer);
    };
    
  }, []);

  // Эффект для обновления данных пользователя при изменении состояния аутентификации
  useEffect(() => {
    if (auth) {
      fetchUsrData();
    }
  }, [auth]);
  
//   // старый вариант
//   const fetchUsrData = async () => {
//     console.log("auth=",auth);
//     const token = localStorage.getItem('access_token');
//     console.log("token=", token);
//     if (!token) {
//       setAuth(false);
//       setUsrData(null);
//     }
//     else {
//       try {
//         const userData = await getCurrentUser();
//         console.log("userData=", userData);
//         console.log("userData.data=", userData.data);
//         setAuth(true)
//         setUsrData(userData.data);
        
//       } 
//       catch (error) {
//         console.error('Ошибка проверки токена:', error);
//         localStorage.removeItem('access_token');
//         setAuth(false);
//         setUsrData(null);
//       }
//     }
//   }


// Функция для получения данных пользователя
  const fetchUsrData = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      // Если токена нет, устанавливаем состояние неаутентифицированным
      setAuth(false);
      setUsrData(null);
      return;
    }

    try {
      // Запрашиваем данные пользователя с текущим токеном
      const userData = await getCurrentUser();
      setAuth(true);
      setUsrData(userData.data);
      
      // Проверяем, нужно ли обновить токен
      if (shouldRefreshToken(token)) {
        await handleTokenRefresh();
      }
    } catch (error) {
      console.error('Ошибка проверки токена:', error);
      logout();
    } finally {
      // После первой проверки отмечаем, что инициализация завершена
      if (initInitialize) {
        setInitInitialize(false);
      }
    }
  };
  

// Функция для декодирования JWT токена (без проверки подписи)
  const decodeToken = (token) => {
    try {
      if (!token) return null;
      // JWT состоит из 3 частей, разделенных точками. Нам нужна вторая часть (payload)
      const base64Url = token.split('.')[1];
      // Заменяем символы, чтобы корректно декодировать base64
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      // Декодируем и парсим JSON
      return JSON.parse(window.atob(base64));
    } catch (error) {
      console.error('Ошибка декодирования токена:', error);
      return null;
    }
  };

  // Функция для получения времени истечения токена
  const getTokenExpiration = (token) => {
    const decoded = decodeToken(token);
    // В JWT время истечения хранится в поле 'exp' в секундах
    if (!decoded || !decoded.exp) return null;
    // Конвертируем в миллисекунды
    return decoded.exp * 1000;
  };

  // Функция проверки, истек ли токен
  const isTokenExpired = (token) => {
    const expiration = getTokenExpiration(token);
    if (!expiration) return true;
    return Date.now() > expiration;
  };

  // Функция проверки, нужно ли обновлять токен (за минуту до истечения)
  const shouldRefreshToken = (token) => {
    const expiration = getTokenExpiration(token);
    if (!expiration) return false;
    // Проверяем, осталось ли меньше минуты до истечения
    return (expiration - Date.now()) < 60000;
  };

  // Функция для обновления токена
  const handleTokenRefresh = async () => {
    const refreshTokenValue = localStorage.getItem('refresh_token');
    if (!refreshTokenValue) {
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
      console.error('Ошибка обновления токена:', error);
      // Если не удалось обновить, разлогиниваем пользователя
      logout();
    }
  };

  // Функция выхода из системы
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setAuth(false);
    setUsrData(null);
    // Очищаем таймер проверки токена
    if (tokenCheckTimer) {
      clearInterval(tokenCheckTimer);
      setTokenCheckTimer(null);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      auth,
      setAuth, 
      showLoginModal, 
      setShowLoginModal,
      usrData,
      logout // функция выхода в контекст
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Добавляем кастомный хук для удобства использования
export const useAuth = () => {
  return useContext(AuthContext);
};