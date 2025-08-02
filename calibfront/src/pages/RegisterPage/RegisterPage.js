import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../../services/api';
import { toast } from 'react-toastify';
// npm install validator
import validator from 'validator';
import { useAuth } from '../../context/AuthContext';

const RegisterPage = () => {
  const { auth, setShowLoginModal } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    password_confirm: '',
    email: '',
    first_name: ''
  });
  const [formCheck, setFormCheck] = useState(false);
  const [emailError, setEmailError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleChangeCheck = (e) => {
    const { name, value, type, checked } = e.target;
    setFormCheck(checked)
    ;
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({...prev, email: value }))
    if (value && !validator.isEmail(value)) {
        setEmailError('Введите корректный email (например: example@mail.com)');
    }
    else {
        setEmailError('');
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    // console.log("formData=",formData)
    // Проверка email перед отправкой
    if (formData.email && !validator.isEmail(formData.email)) {
      toast.error(emailError);
      return;
    }
    else {setEmailError('')}
    if (formData.password !== formData.password_confirm) {
      toast.error('Пароли не совпадают');
      return;
    }
    
    try {
      await registerUser(formData);
      toast.success('Регистрация успешна! Ожидайте подтверждения администратора.');
      navigate('/');
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      toast.error(error.response?.data?.detail || 'Ошибка регистрации');
    }
  };

  const handleShowLogin = () => {
    if (!auth) {
      navigate('/');
      setShowLoginModal(true);
      return;
    }
    
    // Выполняем защищенное действие
  };

  return (
    <div className="container mt-5 pt-3 mb-5 pb-3 animate__animated animate__fadeIn">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card border-primary shadow-lg">
            <div className="card-header bg-primary text-white">
              <h3 className="text-center mb-0">
                {/* <i className="bi bi-pen-fill me-2"></i> */}
                <i className="bi bi-person-plus-fill me-2"></i>
                {/* <i className="bi bi-person-fill-add"></i> */}
                Регистрация
              </h3>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  {/* Поле username */}
                  <label 
                    htmlFor="username" 
                    className="form-label fw-bold text-primary"
                    style={{ textAlign: 'left', display: 'block', marginLeft: 10 }}
                  >
                    <i className="bi bi-person-fill me-2"></i>
                    Имя пользователя (login)
                  </label>
                  <div className='input-group has-validation'>
                    <span className='input-group-text bg-primary text-white'>
                      <i className='bi bi-person'></i>
                    </span>
                    <input
                      type="text"
                      className="form-control form-control-lg border border-primary"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                    />                    
                  </div>                  
                </div>
                {/* Поле first_name */}
                <div className="mb-3">
                  <label 
                    htmlFor="first_name" 
                    className="form-label fw-bold text-primary" 
                    style={{ textAlign: 'left', display: 'block', marginLeft: 10 }}
                  >
                    <i className="bi bi-person-badge-fill me-2"></i>
                    Имя
                  </label>
                  <div className='input-group has-validation'>
                    <span className='input-group-text bg-primary text-white'>
                      <i className='bi bi-person-badge'></i>
                    </span>
                    <input
                      type="text"
                      className="form-control form-control-lg border border-primary"
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      required
                    />
                  </div>                  
                </div>
                {/* Поле email с валидацией */}
                <div className="mb-3">
                  <label 
                    htmlFor="email" 
                    className="form-label fw-bold text-primary" 
                    style={{ textAlign: 'left', display: 'block', marginLeft: 10 }}
                  >          
                    <i className="bi bi-mailbox me-2"></i>          
                    <i className="bi bi-envelope-at-fill me-2"></i>
                    Email
                  </label>
                  <div className='input-group has-validation'>
                    <span className='input-group-text bg-primary text-white'>                      
                      <i className="bi bi-envelope"></i>
                    </span>
                    <input
                      type="text"
                      className={`form-control form-control-lg ${emailError !== '' ? 'is-invalid' : 'border border-primary'}`}
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleEmailChange}
                      onBlur={(e) => {
                        if (e.target.value && !validator.isEmail(e.target.value)) {
                          setEmailError('Введите корректный email (например: example@mail.com)');
                        }
                      }}
                    />
                    {emailError && (<div className="invalid-feedback">{emailError}</div>)}
                  </div>                  
                </div>
                {/* Поле password */}
                <div className="mb-3">
                  <label 
                    htmlFor="password" 
                    className="form-label fw-bold text-primary"
                    style={{ textAlign: 'left', display: 'block', marginLeft: 10 }}
                  >
                    <i className='bi bi-key me-2'></i>
                    Пароль
                  </label>
                  <div className='input-group has-validation'>
                    <span className='input-group-text bg-primary text-white'>
                      <i className='bi bi-lock'></i>
                    </span>
                    <input
                      type="password"
                      className="form-control form-control-lg border border-primary"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength="8"
                    />
                  </div>                  
                </div>
                {/* Поле password_confirm */}
                <div className="mb-3">
                  <label 
                    htmlFor="password_confirm" 
                    className="form-label  fw-bold text-primary"
                    style={{ textAlign: 'left', display: 'block', marginLeft: 10 }}
                  >
                    <i className='bi bi-key-fill me-2'></i>
                    Подтверждение пароля
                  </label>
                  <div className='input-group has-validation'>
                    <span className='input-group-text bg-primary text-white'>                      
                      <i className='bi bi-lock-fill'></i>
                    </span>
                    <input
                      type="password"
                      className="form-control form-control-lg border border-primary"
                      id="password_confirm"
                      name="password_confirm"
                      value={formData.password_confirm}
                      onChange={handleChange}
                      required
                      minLength="3"
                    />
                  </div>   
                  {/* Checkbox для согласия с политикой */}
                  <div className="mt-4 p-3 border border-primary rounded-3 bg-light">
                    <div className="form-check d-flex align-items-center">
                    {/* <div className='input-group form-check mt-3'>                     */}
                      <input
                        type="checkbox"
                        // className="form-control form-control-lg border border-primary"
                        className="form-check-input border-primary me-3"
                        style={{
                          width: '1.5em',
                          height: '1.5em',
                          minWidth: '1.5em',
                          cursor: 'pointer'
                        }}
                        id="agreeToPolicy"
                        name="agreeToPolicy"
                        checked={formCheck}
                        onChange={handleChangeCheck}
                        // required                      
                      />
                      <label className="form-check-label ms-2 fs-6" style={{ cursor: 'pointer' }} htmlFor="agreeToPolicy">
                        <small>Я согласен(а) с{' '}
                        <Link to="/securitypolicy" className="text-primary" target="_blank">
                          политикой безопасности и конфиденциальности
                        </Link></small>
                      </label>
                    </div>                         
                  </div>
                </div>
                <div className='d-grid mt-4'>
                  <button 
                    type='submit' 
                    // className="form-control form-control-lg btn btn-primary w-100"
                    className='btn btn-primary btn-lg rounded-pill shadow-sm animate__animated animate__pulse animate__infinite'
                    disabled={!formCheck}
                  >
                    <i className="bi bi-person-plus me-2"></i>
                    Зарегистрироваться
                  </button>              
                </div>
              </form>
            </div>
            <div className="card-footer bg-light text-center">
              <small className="text-muted">
                Уже есть аккаунт? 
                {/* <Link to='/' className="text-primary" onClick={setShowLoginModal(true)}>Войдите</Link> */}
                <button 
                  className="bg-transparent border-0 cursor-pointer text-primary" 
                  onClick={() => {
                    navigate('/');
                    setShowLoginModal(true);
                  }}
                  // style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Войдите
                </button>
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;