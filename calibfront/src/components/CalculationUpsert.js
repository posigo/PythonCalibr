import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams} from 'react-router-dom';
import { getCalculation, createCalculation, updateCalculation, getUserName, getUserNameList } from '../services/api'
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext'; 
//import { format, parseISO} from 'date-fns'

const CalculationUpsert = () => {
    
  // Получаем id из URL (если есть - режим редактирования, нет - создание)
  const { usrData } = useAuth();
  
  const { id } = useParams();
  const navigate = useNavigate();
  const isMounted = useRef(true); // Флаг для отслеживания mounted состояния
  const navigationOccurred = useRef(false); // Флаг для отслеживания навигации

  // Состояние формы
  const [calculation, setCalculation] = useState ({
    ComponentName: '',
    UpLimitConcSubstance: '',        
    DateTime: new Date().toISOString().slice(0, 16),    // Текущая дата и время
    DateTimeChange: null,
    CountDensities: '',
    Device: '',
    SolutionBasic: '',
    SolutionWorking: '',
    Walvelength: '0',
    Cuvete: '0',
    ChangeOwner: false
  });

  // Состояние для валидации
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  //Загрузка состояния ????
  const [loading, setLoading] = useState(false);

  const [idUserCreate, setIdUserCreate] = useState(0);
  const [idUserChange, setIdUserChange] = useState(0);
  const [nameUserCreate, setNameUserCreate] = useState('');
  const [nameUserChange, setNameUserChange] = useState('');

  const [idUser, setIdUser] = useState(0);
  const [adminUser, setAdminUser] = useState('');
  const [adminGroup, setAdminGroup] = useState(false);

//   useEffect(() => {
//     return () => {
//       isMounted.current = false; // Компонент размонтирован
//     };
//   }, []);

  // Загрузка данных при редактировании
  useEffect(() => {
    if (id) {      
      
      if (!usrData) {
        return <div>Загрузка...</div>; // или null, или редирект
      }      
      const userId = usrData["userid"];
      console.log("userId->",userId);
      console.log("usrData1->",usrData);
      const fetchCalculation = async () => {
        setLoading(true)
        try {

          console.log("usrData2->",usrData['userid']);

          const response = await getCalculation(id);

          console.log("isMounted.currenta->", isMounted.current)
          console.log("navigationOccurred.current->", navigationOccurred.current)

          if (!isMounted.current) return; // Проверка на mounted состояние
          console.log("usrData3->",usrData['userid']);
          setIdUser(usrData['userid']);
          setAdminUser(usrData['username']);
          setAdminGroup(usrData['groups'].includes('admins'));
          // Проверка прав доступа
          if (response.data.ChangeOwner &&
              usrData['username'] !== 'admin' && 
              !usrData['groups'].includes('admins') &&
              response.data.IdCreate !== usrData['userid']
          ) {
            if (!navigationOccurred.current) {
              navigationOccurred.current = true;
              toast.error('У вас нет прав для редактирования этого расчета');
              navigate(-1); // Возврат на предыдущую страницу
            }
            return;            
          }
          // if (response.data.ChangeOwner && response.data.IdCreate !== usrData['userid']) {
          //   if (!navigationOccurred.current) {
          //     navigationOccurred.current = true;
          //     toast.error('У вас нет прав для редактирования этого расчета');
          //     navigate(-1); // Возврат на предыдущую страницу
          //   }
          //   return;
          // }
          setCalculation(response.data);
          setIdUserCreate(response.data['IdCreate']);
          setIdUserChange(response.data['IdChange']);  
        }
        catch (error) {
          if (!isMounted.current) return;
          handleApiError(error);
          if (!navigationOccurred.current) {
            navigationOccurred.current = true;
            navigate('/calculations', { replace: true });
          }
        }
        finally { 
          if (isMounted.current) {
            setLoading(false)
          }
        }        
      };
      fetchCalculation();
    }
  }, [id, navigate]);

  useEffect(() => {
    if (idUserCreate || idUserChange) {
      fetchUserNamelist();
    }
  }, [idUserCreate, idUserChange]);

  const fetchUserNamelist = async () =>  {
    try {
      // Собираем уникальные ID (исключаем 0 и дубликаты)
      const ids = [idUserCreate, idUserChange].filter(id => id && id > 0);
      if (ids.length === 0) return;

      const responseUser = await getUserNameList(ids);
      console.log("User data:", responseUser.data);

      console.log("responseUser.data.find(usr => usr.id === idUserCreate):", responseUser.data['users'].find(usr => usr.id === idUserCreate));
    
      // Устанавливаем имена, если пользователи найдены
      const userCreate = responseUser.data['users'].find(usr => usr.id === idUserCreate);
      const userChange = responseUser.data['users'].find(usr => usr.id === idUserChange);
    
      setNameUserCreate(userCreate ? userCreate.username : 'None');
      setNameUserChange(userChange ? userChange.username : 'None');
    } catch (error) {
      console.error("Error fetching user names:", error);
      setNameUserCreate('None');
      setNameUserChange('None');
    }    
  }

  const handleApiError = (error) => {
      console.error('Ошибка:', error);
      if (error.response?.status === 401) {
        toast.error('У вас нет необходимых разрешений');
      } else if (error.response?.status === 403) {
        toast.error('У вас нет прав для этого действия');
      } else {
        toast.error('Произошла ошибка, status->', error.response?.status);
      }
  };

  // Обработчик изменения полей формы
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCalculation(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const formatDateTimeForInput = (dateString) => {
    if (!dateString) return '';
        
    const date = new Date(dateString);
        
      // Корректировка временной зоны (если нужно)
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() - timezoneOffset);
        
    return adjustedDate.toISOString().slice(0, 16);
  };

  // Валидация формы
  const validate = () => {
    const newErrors = {};
    if (!calculation.ComponentName.trim()) { newErrors.ComponentName = 'Название компонента обязательно'; }
    if (!calculation.UpLimitConcSubstance || isNaN(calculation.UpLimitConcSubstance)) { 
      newErrors.UpLimitConcSubstance = 'Предел концентрации обязателен и должен быть числом'; 
    }
    if (!calculation.DateTime) { newErrors.DateTime = 'Дата обязательна'; }
    if (!id && (!calculation.CountDensities ||  isNaN(calculation.CountDensities))) { // Только для нового расчета
      newErrors.CountDensities = 'Количество плотностей обязательно и должно быть числом'; 
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Отправка формы
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    console.log("CalculationsUpdate->updatge");
    try {
      if (id) {
        console.log("CalculationsUpdate->", calculation);
                //режим редактирования
        const responseUpdate = await updateCalculation(id, calculation);
        console.log('responseUpdate.data-', responseUpdate.data)
        
        setIdUserCreate(responseUpdate.data['IdCreate']);
        setIdUserChange(responseUpdate.data['IdChange']);  

        toast.success("Расчёт успешно обновлён!");                
      }
      else {
        //режим создания
        console.log("create calculation->", calculation)
        const response = await createCalculation(calculation);                
        // После создания переходим в режим редактирования
          navigate(`/calculations/${response.data.id}/edit`);
          toast.success("Расчёт успешно создан!");
        }
    }
    catch(error) {
      console.error('Ошибка при создании/обновлении расчёта: ', error)
      if (error.response && error.response.data) {
        // Обработка ошибок валидации с сервера
        toast.error(`Ошибка: ${JSON.stringify(error.response.data)}`);
      } 
      else {
        toast.error('Ошибка при создании/обновлении расчёта');
      }
    }
    finally {
      setIsSubmitting(false);
    }
  };

    // Переход к редактированию растворов
  const handleEditSolutions = () => {
    // console.log("cu: " + calculation.CountDensities)
    navigate(`/calculations/${id}/solutions/${calculation.CountDensities}`)
  };

  if (loading) {
    return (<div>Загрузка...</div>)
  }

  // if (isChangeOwner ) {
  //   console.log("return--run")
  //   return
  // }

  return (    
    <div className='container-fluid pt-3 mt-5 mb-5 '>
      <div 
        className='row d-flex v1h-100' 
        // style={{ display: 'flex', height: '100vh' }}
      >
        <div className="col col-1" style={{ backgroundColor: '#f8f9fa' }}></div>
        <div 
          className="col col-10 max-vh-100"
        //   className="col col-10 overflow-y-auto max-vh-100"  // overflow-y-auto  задаёт вертикальную прокрутку при необходимости
        //   style={{ overflowY: 'auto', maxHeight: '100vh' }}
        >
          <div className='container'>            
            <form onSubmit={handleSubmit} className=''>
              <div className="container card">
                <div className='card-header bg-info mt-1'>
                  <div className='row'>
                    <div className='col text-center h2'>
                      {id ? <i className="bi bi-pencil me-1"></i> : <i className="bi bi-file-earmark-plus me-1"></i>}  
                      <i className="bi bi-file-text me-2"></i>
                      {id ? 'Редактирование расчёта' : 'Создание нового расчёта'}
                      {/* <span className='ms-2'>({!!id ? userChange['username'] : ''})</span>                       */}
                    </div>  
                  </div>
                </div>
                  <div className='card-body'>
                    {!!id ? (
                      <>
                      
                        <div className=' input-group align-items-center mb-1 py-0'> 
                          <span className='input-group-texts'><i className="bi bi-person-badge me-2 fs-4"></i></span>    
                          <p className='form-control text-start fs-6 my-0 py-0 text-secondary'>
                            <small><span className=''>Автор расчёта <strong>{nameUserCreate}</strong></span></small><br />
                            <small><span className=''>Последнее изменение <strong>{nameUserChange}</strong></span></small>
                          </p>
                          
                        </div>
                      </>
                    ) : (
                      <></>
                    )}
                    
                    {/* Обязательные поля */}                    
                    <div className='input-group align-items-center mb-3 py-1'>                      
                      <span className='input-group-texts'><i className="bi bi-puzzle me-2 fs-4"></i></span>                                            
                      <div className="form-floating flex-grow-1">
                        <input
                          type="text"
                          className={`form-control ${errors.ComponentName ? 'is-invalid' : ''}`}
                          name="ComponentName"
                          value={calculation.ComponentName || ''}
                          onChange={handleChange}
                          id="UpsertComponentName"   
                        />
                        <label className="form-label" htmlFor="UpsertComponentName">Компонент *</label>
                        {errors.ComponentName && <span className="invalid-feedback">{errors.ComponentName}</span>}
                      </div>
                    </div>
                    <div className='input-group align-items-center mb-3 py-1'>
                      <span className='input-group-texts'><i className="bi bi-moisture me-2 fs-4"></i></span>    
                      <div className="form-floating flex-grow-1">
                        <input
                          type="number"
                          className={`form-control ${errors.UpLimitConcSubstance ? 'is-invalid' : ''}`}
                          name="UpLimitConcSubstance"
                          value={calculation.UpLimitConcSubstance || ""}
                          onChange={handleChange}
                          step="0.01"
                          id="UpsertUpLimitConcSubstance"                                    
                        />
                        <label className="form-label" htmlFor="UpsertUpLimitConcSubstance">Предел верхней концентрации *</label>
                        {errors.UpLimitConcSubstance && <span className="invalid-feedback">{errors.UpLimitConcSubstance}</span>}    
                      </div>
                    </div>

                    <div className='input-group align-items-center mb-3 py-1'>
                      <span className='input-group-texts'><i className="bi bi-person-lines-fill me-2 fs-4"></i></span>    
                      <div className="form-floating flex-grow-1">
                        <div 
                          className={`form-control ${errors.ChangeOwner ? 'is-invalid' : ''}`} 
                          style={{height: 'auto', minHeight: '58px', display: 'flex', alignItems: 'center', padding: '0.75rem 1rem'}}
                        >      
                          <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', width: '100%'}}>
                            <label 
                              className="form-label mb-0 me-5 text-secondary" htmlFor="ChangeOwner" 
                              // style={{flexShrink: 0, display: 'flex', alignItems: 'center', height: '100%'}}
                              style={{flex: '0 1 400px', minWidth: 'min-content'}}
                            >
                              Редактировать может только автор расчёта *
                            </label>        
                            <div className="form-switch">
                              <input
                                type="checkbox"
                                className={`form-check-input ${errors.ChangeOwner ? 'is-invalid' : ''} fs-4`}
                                name="ChangeOwner"
                                checked={calculation.ChangeOwner || false}
                                onChange={handleChange}
                                id="ChangeOwner"
                                style={{margin: 0, transform: 'scale(1.2)' }}
                                disabled={()=>{
                                    console.log("usrData4->", usrData);
                                    return !!id && idUser!==idUserCreate && adminUser!=='admin' && !adminGroup}
                                    // return !!id && usrData['userid']!==idUserCreate && usrData['username']!=='admin' && !usrData['groups'].includes('admins')}
                                }
                              />
                            </div>
                          </div>      
                          {errors.ChangeOwner && (<span className="invalid-feedback" style={{display: 'block'}}>{errors.ChangeOwner}</span>)}    
                        </div>
                      </div>
                    </div>

                    <div className='input-group align-items-center mb-3 py-1'>
                      <span className='input-group-texts'><i className="bi bi-calendar me-2 fs-4"></i></span>
                      <div className="form-floating flex-grow-1">                                
                        {!!id ? (
                          <>
                            <input
                              type="datetime-local"
                              className={`py-8 form-control ${errors.DateTimeChange ? 'is-invalid' : ''}`}
                              name="DateTimeChange"                            
                              value={formatDateTimeForInput(calculation.DateTimeChange) || ''}
                              onChange={handleChange}
                              id="UpsertDateTime"
                            />
                            <label className="form-label" htmlFor="UpsertDateTime">Дата расчета *</label>
                          </>
                        ) : (
                          <>
                            <input
                              type="datetime-local"
                              className={`py-8 form-control ${errors.DateTime ? 'is-invalid' : ''}`}
                              name="DateTime"                            
                              value={formatDateTimeForInput(calculation.DateTime) || ''}
                              onChange={handleChange}
                              id="UpsertDateTime"
                              disabled="1"
                            />
                            <label className="form-label" htmlFor="UpsertDateTime">Дата расчета *</label>
                          </>
                        )}                  
                        {errors.DateTime && <span className="invalid-feedback">{errors.DateTime}</span>}
                      </div>
                    </div>
                    <div className='input-group align-items-center mb-3 py-1'>
                      <span className='input-group-texts'><i className="bi bi-layers me-2 fs-4"></i></span>
                      <div className="form-floating flex-grow-1">                                
                        <input  
                          type='number'
                          className={`form-control ${errors.CountDensities ? 'is-invalid' : ''}`}
                          name='CountDensities'
                          value={calculation.CountDensities || ''}
                          onChange={handleChange}
                          disabled={!!id} //Отключаем в режиме редактирования
                          id="UpsertCountDensities"
                        />  
                        <label className='form-label' htmlFor="UpsertCountDensities">Количество плотностей в растворе *</label>
                        {errors.CountDensities && <span className="invalid-feedback">{errors.CountDensities}</span>}
                      </div>
                    </div>
                    {/* Необязательные поля */}
                    <div className='input-group align-items-center mb-3 py-1'>
                      <span className='input-group-texts'><i className="bi bi-screwdriver me-2 fs-4"></i></span>
                      <div className="form-floating flex-grow-1">                                
                        <input
                          type="text"
                          className="form-control"
                          name="Device"
                          value={calculation.Device || ''}
                          onChange={handleChange}
                          id="UpsertDevice"
                        />
                        <label className="form-label" htmlFor="UpsertDevice">Прибор</label>
                      </div>
                    </div>
                    <div className='input-group align-items-center mb-3 py-1'>
                      <span className='input-group-texts'><i className="bi bi-journal-text me-2 fs-4"></i></span>
                      <div className="form-floating flex-grow-1">                                
                        <input
                          type="text"
                          className="form-control"
                          name="Method"
                          value={calculation.Method || ''}
                          onChange={handleChange}
                          id="UpsertDevice"
                        />
                        <label className="form-label" htmlFor="Method">Метод</label>
                      </div>
                    </div>
                    <div className='input-group align-items-center mb-3 py-1'>
                      <span className='input-group-texts'><i className="bi bi-droplet me-2 fs-4"></i></span>
                      <div className="form-floating flex-grow-1">
                        <input
                          type="text"
                          className="form-control"
                          name="SolutionBasic"
                          value={calculation.SolutionBasic || ''}
                          onChange={handleChange}                                    
                          id="SolutionBasic"
                        />
                        <label className="form-label" htmlFor="SolutionBasic">Базовый раствор</label>
                      </div>
                    </div>
                    <div className='input-group align-items-center mb-3 py-1'>
                      <span className='input-group-texts'><i className="bi bi-droplet-fill me-2 fs-4"></i></span>          
                      <div className="form-floating flex-grow-1">                            
                        <input
                          type="text"
                          className="form-control"
                          name="SolutionWorking"
                          value={calculation.SolutionWorking || ''}
                          onChange={handleChange}
                          id="SolutionWorking"
                        />
                        <label className="form-label" htmlFor="SolutionWorking">Рабочий раствор</label>
                      </div>
                    </div>
                    <div className='input-group align-items-center mb-3 py-1'>
                      <span className='input-group-texts'><i className="bi bi-soundwave me-2 fs-4"></i></span>          
                      <div className="form-floating flex-grow-1">                               
                        <input
                          type="number"
                          className="form-control"
                          name="Walvelength"
                          value={calculation.Walvelength || 0}
                          onChange={handleChange}
                          id="UpsertWalvelength"
                        />
                        <label className="form-label" htmlFor="UpsertWalvelength">Длина волны</label>
                      </div>   
                    </div>
                    <div className='input-group align-items-center mb-3 py-1'>
                      <span className='input-group-texts'><i className="bi bi-paint-bucket me-2 fs-4"></i></span>          
                      <div className="form-floating flex-grow-1">                               
                        <input
                          type="number"
                          className="form-control"
                          name="Cuvete"
                          value={calculation.Cuvete || 0}
                          onChange={handleChange}
                          id="UpsertCuvete"
                        />
                        <label className="form-label" htmlFor="UpsertCuvete">Размер кюветы</label>
                      </div>  
                    </div>                                    
                  </div>
                <div className='card-footer text-center mb-1' style={{backgroundColor: 'rgba(0, 0, 0, 0.25)'}}>
                  <div className=''>
                    <button
                      type="button"
                      className="btn btn-secondary me-2"
                      onClick={() => navigate('/calculations/')}
                    >
                      <i className="bi bi-list-columns me-2"></i>  
                      Назад к списку расчётов
                    </button>
                    <button
                      type="submit"
                      className='btn btn-primary me-2'
                      disabled={isSubmitting}
                    >
                      {id ? <i className="bi bi-arrow-repeat me-2"></i> : <i className="bi bi-save me-2"></i>}  
                      {id ? 'Обновить' : 'Создать'}
                    </button>
                    { id && (
                      <button
                        type="submit"
                        className="btn btn-info"
                        onClick={handleEditSolutions}
                      >
                        <i className="bi bi-droplet-half me-2"></i>
                        Редактировать растворы
                      </button>
                    )}
                    { id && (
                      <button
                        type="button"
                        className="btn btn-success m-2" // Убираем подчеркивание у ссылки
                        onClick={() => {navigate(`/calculations/${calculation.id}`)}}
                      >
                        <i className="bi bi-graph-up me-2"></i>
                        Перейти к расчёту
                      </button>
                    )}
                  </div>
                </div>  
              </div>
            </form>                
            <div className='container mt-4'>
                            
            </div> 
          </div>
        </div>
        <div className="col col-12 col-md-1 col-sm-1 sticky-top align-self-start bg-light p-2">
          <form onSubmit={handleSubmit} className=''>
            <div className='d-flex flex-column gap-2'>
              <button
                type="button"
                className="btn btn-secondary w-100 py-2"
                onClick={() => navigate('/calculations/')}
              >
                <i className="bi bi-list-columns me-2"></i>
                список расчётов
              </button>
              <button
                type="submit"
                className='btn btn-primary w-100 py-2'
                disabled={isSubmitting}
              >
                {id ? <i className="bi bi-arrow-repeat me-2"></i> : <i className="bi bi-save me-2"></i>}
                {id ? 'Обновить' : 'Создать'}
              </button>
              { id && (
                <button
                  type="submit"
                  className="btn btn-info w-100 py-2"
                  onClick={handleEditSolutions}
                >
                  <i className="bi bi-droplet-half me-2"></i>
                  Растворы
                </button>
              )}
              { id && (
                <button
                  type="button"
                  className="btn btn-success w-100 py-2"
                  onClick={() => {navigate(`/calculations/${calculation.id}`)}}
                >
                  <i className="bi bi-graph-up me-2"></i>
                  К расчёту
                </button>
              )}
            </div>
          </form>
        </div>
      </div>            
    </div>        
    );
};

export default CalculationUpsert