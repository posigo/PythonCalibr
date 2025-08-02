import React,  {useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { logoutUser, getCurrentUser} from '../../services/api'
import logo_icon from '../../assest/logo_icon.png'
import { constTexts } from '../../utils/constTexts';
import { toast } from 'react-toastify';
import LoginModal from '../Login/LoginModal';

const Header = () => {    
    const { auth, setAuth, setShowLoginModal, usrData } = useAuth();
    
    // const [ username, setUsername ] = useState('');
    // const [ password, setPassword ] = useState('');
    // const [ showLogin, setShowLogin ] = useState(false);
    const [ userData, setUserData ] = useState(null);
    // const [isLoading, setIsLoading] = useState(false);
    // const [errorMessage, setErrorMessage] = useState(null);
    // const [showAdminMenu, setShowAdminMenu] = useState(false); // Состояние для отображения подменю
    
    const navigate = useNavigate();

  useEffect(() => {
    // Проверяем, есть ли токен в localStorage при загрузке компонента
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchUserData();
    }
  }, []);

  // Запрос текущего аутентифицированного пользователя
  const fetchUserData = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await getCurrentUser();
      setUserData(response.data);
    } 
    catch (error) {
      console.error('Ошибка при получении данных пользователя:', error);
      toast.error('Ошибка при получении данных пользователя:')
      // Если ошибка 401 - очищаем невалидный токен
      if (error.response?.status === 401) {
        localStorage.removeItem('access_token');
        setAuth(false);
      }
    }    
  };

  // const handleLogin = async (e) => {
  //   e.preventDefault();    
  //   try {
  //     const response = await login(username, password);
  //     //console.log("reslgn", response);
  //     localStorage.setItem('access_token', response.data.access);
  //     localStorage.setItem('refresh_token', response.data.refresh);
  //     setAuth(true);
  //     await fetchUserData();
  //     setShowLogin(false);
  //     setPassword('');
  //     setUsername('');
  //     toast.success('Вход выполнен успешно');      
  //   } catch (error) {
  //     console.error('Ошибка входа:', error);
  //     setErrorMessage('Ошибка входа: ' + error)
  //     if (error.response?.status === 400 || error.response?.status === 401) {
  //       if ('unverified' in (error.response?.data || {})) {
  //         const value = error.response.data.unverified;
  //         if (value.some(v => v==='1')) {
  //           setErrorMessage('Ошибка входа: Вас не подтвердили администраторы (' + error.response?.status + ')');
  //         }
  //         else 
  //         {
  //           setErrorMessage('Ошибка входа: Состояние подтверждения не определно (' + error.response?.status + ')');
  //         }
  //       }
  //       else {
  //         setErrorMessage('Ошибка входа: Некорректные учетные данные (' + error.response?.status + ')');
  //       }        
  //     } 
  //     else 
  //       if (error.response?.status === 403) {
  //         if ('unverified' in (error.response?.data || {})) {
  //           const value = error.response.data.unverified;
  //           if (value.some(v => v==='1')) {
  //             setErrorMessage('Ошибка входа: Вас не подтвердили администраторы (' + error.response?.status + ')');
  //           }
  //           else 
  //           {
  //             setErrorMessage('Ошибка входа: Состояние подтверждения не определно (' + error.response?.status + ')');
  //           }
  //         }
  //         setErrorMessage('Ошибка входа: Некорректные учетные данные (' + error.response?.status + ')');
  //       } 
  //       else {
  //         setErrorMessage('Ошибка входа: ' + error.message + '(' + error.response?.status + ')');
  //       }
  //     toast.error(errorMessage);
  //     //alert('Неверные учетные данные');
  //   }
  //   finally {      
  //     setIsLoading(false)
  //   }
  // };

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      await logoutUser(refreshToken);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setAuth(false);
      setUserData(null);
      navigate('/');
    } catch (error) {
      console.error('Ошибка выхода:', error);
    }
  };

  // Проверяем существование usrData перед обращением к его свойствам
  const isAdmin = usrData && (usrData.is_superuser || (usrData.groups && usrData.groups.indexOf('admins') !== -1));

  return (
    <div className='fixed-top align-self-stretch'>
    <header className="navbar navbar-expand-lg navbar-dark bg-dark">     
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">
          <img src={logo_icon} alt="Начало" />
        </Link>        
        <div className="collapse navbar-collapse">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link 
                className="nav-link btn btn-dark text-white" 
                to="/calculations"
              >
                {constTexts.nav.calculation}
              </Link>
            </li>
            {auth && (
              <li className="nav-item dropdown">
                <button 
                  className="btn btn-dark dropdown-toggle" 
                  data-bs-toggle="dropdown" 
                  aria-expanded="false"           
                >
                  {constTexts.nav.cabnt.main}
                </button>
                <ul className="dropdown-menu dropdown-menu-dark">
                  {/* <li>
                    <Link
                      className="dropdown-item"                         
                      to="/adminpanel"                        
                    >
                      {constTexts.nav.cabnt.sub.user}
                    </Link>
                  </li> */}
                  <li>
                    <Link
                      className="dropdown-item"                         
                      to="/adminpanel2"                        
                    >
                      {constTexts.nav.cabnt.sub.user}
                    </Link>
                  </li>
                  <li>
                    <Link 
                      className="dropdown-item" 
                      to="/notifications"                        
                    >
                      {constTexts.nav.cabnt.sub.notif}
                    </Link>
                  </li>
                  {isAdmin && (
                    <li>
                    <Link 
                      className="dropdown-item" 
                      to="/histories"                        
                    >
                      {constTexts.nav.cabnt.sub.hist}
                    </Link>
                  </li>
                  )}                  
                </ul>                
              </li>
            )}
          </ul>
          
          <div className="d-flex">
            {auth ? (
              <div className="dropdown">
                <button 
                  className="btn btn-outline-light dropdown-toggle" 
                  type="button" 
                  id="userDropdown"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  {console.log("usrDsta=",usrData)}
                  {usrData?.first_name || usrData?.username || constTexts.userheader.othername }
                </button>
                <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                  <li>
                    <Link className="dropdown-item" to="/profile">
                      {/* Профиль */}
                      {constTexts.userheader.profiletext}
                    </Link>
                  </li>
                  <li>
                    <button className="dropdown-item" onClick={handleLogout}>
                      {/* Выйти */}
                      {constTexts.userheader.exittext}
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <>
                <button 
                  className="btn btn-outline-light me-2" 
                  onClick={() => {
                    navigate('/');
                    setShowLoginModal(true);                                        
                  }}
                >
                  {/* Войти */}
                  {constTexts.userheader.entertext}
                </button>
                <Link to="/register" className="btn btn-primary">
                  {/* Регистрация */}
                  {constTexts.register.headertext}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Модальное окно */}
        <LoginModal />

    </header>
    </div>
  );
};

export default Header;
