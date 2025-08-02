import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { login, getCurrentUser } from '../../services/api';
import { useAuth } from '../../context/AuthContext'; 

const LoginModal = () => {
  const { auth, setAuth, usrData, setUsrData, showLoginModal, setShowLoginModal } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const navigate = useNavigate();
  
  //navigate('/');
//   const fetchUserData = async () => {
//     const token = localStorage.getItem('access_token');
//     if (!token) return;

//     try {
//       const userData = await getCurrentUser();
//       setAuth({
//         isAuthenticated: true,
//         user: userData
//       });   
//       return userData   
//     } 
//     catch (error) {
//       console.error('Ошибка при получении данных пользователя:', error);
//       toast.error('Ошибка при получении данных пользователя');
//       if (error.response?.status === 401) {
//         localStorage.removeItem('access_token');
//         setAuth({
//             isAuthenticated: false,
//             user: null
//         });  
//       }
//       // throw error;
//     }
//   };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);    
    
    try {
      const response = await login(username, password);
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      setAuth(true);      
      setUsrData(usrData);
      toast.success('Вход выполнен успешно');
      setShowLoginModal(false);
      setPassword('');
      setUsername('');     
    } 
    catch (error) {
      console.error('Ошибка входа:', error);
      let errorMsg = 'Ошибка входа';
      
      if (error.response?.status === 400 || error.response?.status === 401) {
        if (error.response.data?.unverified?.includes('1')) {
          errorMsg = 'Вас еще не подтвердили администраторы';
        } else {
          errorMsg = 'Некорректные учетные данные';
        }
      } else if (error.response?.status === 403) {
        if (error.response.data?.unverified?.includes('1')) {
          errorMsg = 'Вас еще не подтвердили администраторы';
        } else {
          errorMsg = 'Доступ запрещен';
        }
      } else {
        errorMsg = error.message || 'Произошла ошибка при входе';
      }
      
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!showLoginModal) return null;

  return (
    <div 
      className='modal fade show d-block modal-dialog-scrollable animate__animated animate__fadeIn' 
      // style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
      tabIndex='-1'
      role='dialog'
      aria-modal="true"   
      onClick={() => {
        if (!isLoading) {
          setShowLoginModal(false);
          setPassword('');
          setUsername('');
        }
      }}
      // onKeyDown={(e) => e.key === 'Escape' && !isLoading && setShowLoginModal(false)}
      onKeyDown={(e) => { if (e.key === 'Escape' && !isLoading) { setShowLoginModal(false); }}}
    >
      <div 
        className='modal-dialog modal-dialog-centered' 
        role="document" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content border-primary shadow-lg mb-5">
          <div className="modal-header bg-primary text-while">
            <h5 className="modal-title text-center mb-0">
              <i className="bi bi-box-arrow-in-right me-2"></i>
              Вход в систему
            </h5>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={() => {
                if (!isLoading) {
                  setShowLoginModal(false);
                  setPassword('');
                  setUsername('');
                }
              }}
              disabled={isLoading}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body" 
              style={{ maxHeight: '70vh', overflowY: 'auto' }}
          >
            {/* Сообщения об ошибках */}
            {errorMessage && (
              <div className='alert alert-danger d-flex align-items-center'>
                <i className='bi bi-exclamation-triangle-fill me-2'></i>
                <div>{errorMessage}</div>
              </div>
            )}
            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label htmlFor="username" className="form-label fw-bold text-primary">
                  <i className="bi bi-person-fill me-2"></i>
                  Имя пользователя
                </label>
                <div className='input-group'>
                  <span className='input-group-text bg-primary text-white'>
                    <i className='bi bi-person'></i>
                  </span>
                  <input 
                    type="text" 
                    className="form-control form-control-lg border-primary" 
                    id="username" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder='Введите ваш логин'
                    required
                    autoFocus
                    disabled={isLoading}
                  />
                </div>                    
              </div>
              <div className="mb-4">
                <label htmlFor="password" className="form-label fw-bold text-primary">
                  <i className='bi bi-key-fill me-2'></i>
                  Пароль
                </label>
                <div className='input-group'>
                  <span className='input-group-text bg-primary text-white'>
                    <i className='bi bi-lock'></i>
                  </span>
                  <input 
                    type="password" 
                    className="form-control form-control-lg" 
                    id="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder='Введите ваш пароль'
                    required
                    disabled={isLoading}
                  />
                </div>                    
              </div>
              <div className='d-grid gap-2 mt-4'>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-lg btn btn-primary btn-lg rounded-pill shadow-sm animate__animated animate__pulse animate__infinite"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className='spinner-border spinner-border-sm me-2' role='status' aria-hidden='true'></span>
                      Вход...
                    </>
                  ) : (
                    <>
                      <i className='bi bi-box-arrow-in-right me-2'></i>
                      Войти
                    </>
                  )}                      
                </button>
                <button
                  type='button'
                  className='btn btn-outline-secondary'
                  onClick={() => {
                    setShowLoginModal(false);
                    setPassword('');
                    setUsername('')
                  }}
                  disabled={isLoading}
                >
                  Отмена
                </button>
              </div>                  
            </form>
            <div className='text-center mt-3'>
              <button
                className='text-decoration-none btn btn-link p-0' 
                onClick={() => toast.warning('Функция находится в стадии разработки')}
              >
                Забыли пароль?
              </button>
            </div>
          </div>
          <div className="modal-footer bg-light">
            <small className="text-muted">
              Впервые здесь?  
              {/* <a href="#!" className="text-decoration-none">Зарегистрируйтесь</a> */}
              <Link 
                to="/register" 
                className="text-decoration-none ms-1"
                onClick={() => setShowLoginModal(false)}
              >
                Зарегистрируйтесь
              </Link>
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;