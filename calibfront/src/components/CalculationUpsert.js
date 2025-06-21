import React, { Link, useState, useEffect } from 'react';
import { useNavigate, useParams} from 'react-router-dom';
import { getCalculation, createCalculation, updateCalculation, fetchCalculation } from '../services/api'
import { toast } from 'react-toastify';
//import { format, parseISO} from 'date-fns'

const CalculationUpsert = () => {
  // Получаем id из URL (если есть - режим редактирования, нет - создание)
  const { id } = useParams();
  const navigate = useNavigate();

  // Состояние формы
  const [calculation, setCalculation] = useState ({
    ComponentName: '',
    UpLimitConcSubstance: '',        
    DateTime: new Date().toISOString().slice(0, 16),    // Текущая дата и время
    CountDensities: '',
    Device: '',
    SolutionBasic: '',
    SolutionWorking: '',
    Walvelength: '0',
    Cuvete: '0'
  });

  // Состояние для валидации
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  //Загрузка состояния ????
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      fetchCalculation(id)
        .then(data => setCalculation(data))
        .finally(() => setLoading(false));
    }
  }, [id]);

  // Загрузка данных при редактировании
  useEffect(() => {
    if (id) {        
      const fetchCalculation = async () => {
        setLoading(true)
        try {
          const response = await getCalculation(id);
          setCalculation(response.data);
        }
        catch (error) {handleApiError(error)}
        finally { setLoading(false)}        
      };
      fetchCalculation();
    }
  }, [id]);

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
    const { name, value } = e.target;
    setCalculation(prev => ({
      ...prev,[name]: value
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

    try {
      if (id) {
                //режим редактирования
        await updateCalculation(id, calculation);
        toast.success("Расчёт успешно обновлён!");                
      }
      else {
        //режим создания
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
                      {id ? <i class="bi bi-pencil me-1"></i> : <i class="bi bi-file-earmark-plus me-1"></i>}  
                      <i class="bi bi-file-text me-2"></i>
                      {id ? 'Редактирование расчёта' : 'Создание нового расчёта'}
                    </div>  
                  </div>
                </div>
                  <div className='card-body'>
                    {/* Обязательные поля */}                    
                    <div className='input-group align-items-center'>                      
                      <span className='input-group-texts py-3 mb-3'><i class="bi bi-puzzle me-2 fs-4"></i></span>                      
                      <i class="bi-arrow-up-circle"></i><i class="bi-slash-circle text-danger"></i>
                      <div className="row form-floating mb-3 py-1 flex-grow-1">
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
                      
                      {/* </div> */}
                    </div>
                                    <div className="row form-floating mb-3 py-1">
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
                                    <div className="row form-floating mb-3 py-1">                                
                                        <input
                                            type="datetime-local"
                                            className={`py-8 form-control ${errors.DateTime ? 'is-invalid' : ''}`}
                                            name="DateTime"
                                            //value={calculation.DateTime}
                                            value={formatDateTimeForInput(calculation.DateTime) || ''}
                                            onChange={handleChange}
                                            id="UpsertDateTime"
                                        />
                                        <label className="form-label" htmlFor="UpsertDateTime">Дата расчета *</label>
                                        {errors.DateTime && <span className="invalid-feedback">{errors.DateTime}</span>}
                                    </div>
                                    <div className="row form-floating mb-3 py-1">                                
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
                                    {/* Необязательные поля */}
                                    <div className="row form-floating mb-3 py-1">                                
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
                                    <div className="row form-floating mb-3 py-1">
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="SolutionBasic"
                                            value={calculation.SolutionBasic || ''}
                                            onChange={handleChange}                                    
                                            id="UpsertSolutionBasic"
                                        />
                                        <label className="form-label" htmlFor="UpsertSolutionBasic">Базовый раствор</label>
                                    </div>
                                    <div className="row form-floating mb-3 py-1">                            
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="SolutionWorking"
                                            value={calculation.SolutionWorking || ''}
                                            onChange={handleChange}
                                            id="UpsertSolutionWorking"
                                        />
                                        <label className="form-label" htmlFor="UpsertSolutionWorking">Рабочий раствор</label>
                                    </div>
                                    <div className="row form-floating mb-3 py-1">                               
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
                                    <div className="row form-floating mb-3 py-1">                               
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
                <div className='card-footer text-center mb-1' style={{backgroundColor: 'rgba(0, 0, 0, 0.25)'}}>
                  <div className=''>
                    <button
                      type="button"
                      className="btn btn-secondary me-2"
                      onClick={() => navigate('/calculations/')}
                    >
                      <i class="bi bi-list-columns me-2"></i>  
                      Назад к списку расчётов
                    </button>
                    <button
                      type="submit"
                      className='btn btn-primary me-2'
                      disabled={isSubmitting}
                    >
                      {id ? <i class="bi bi-arrow-repeat me-2"></i> : <i class="bi bi-save me-2"></i>}  
                      {id ? 'Обновить' : 'Создать'}
                    </button>
                    { id && (
                      <button
                        type="submit"
                        className="btn btn-info"
                        onClick={handleEditSolutions}
                      >
                        <i class="bi bi-droplet-half me-2"></i>
                        Редактировать растворы
                      </button>
                    )}
                    { id && (
                      <button
                        type="button"
                        className="btn btn-success m-2" // Убираем подчеркивание у ссылки
                        onClick={() => {navigate(`/calculations/${calculation.id}`)}}
                      >
                        <i class="bi bi-graph-up me-2"></i>
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
                <i class="bi bi-list-columns me-2"></i>
                список расчётов
              </button>
              <button
                type="submit"
                className='btn btn-primary w-100 py-2'
                disabled={isSubmitting}
              >
                {id ? <i class="bi bi-arrow-repeat me-2"></i> : <i class="bi bi-save me-2"></i>}
                {id ? 'Обновить' : 'Создать'}
              </button>
              { id && (
                <button
                  type="submit"
                  className="btn btn-info w-100 py-2"
                  onClick={handleEditSolutions}
                >
                  <i class="bi bi-droplet-half me-2"></i>
                  Растворы
                </button>
              )}
              { id && (
                <button
                  type="button"
                  className="btn btn-success w-100 py-2"
                  onClick={() => {navigate(`/calculations/${calculation.id}`)}}
                >
                  <i class="bi bi-graph-up me-2"></i>
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