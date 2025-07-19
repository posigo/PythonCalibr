import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCalculations, getCalculationsUsers } from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const CalculationList = () => {

  const { usrData } = useAuth()

  const { setShowLoginModal } = useAuth()
  const [calculations, setCalculations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCalculations = async () => {
      try {
        // const response = await getCalculations();
        const response = await getCalculationsUsers();
        console.log("response from calc-list->", response.data);
        setCalculations(response.data);
        setError(null);
      }
      catch (err) {
        if (err.response && err.response.status === 401) {
          // Проверяем наличие токена аутентификации
          const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
          if (!token) {
            setError('Для просмотра расчетов необходимо аутентифицироваться');
            toast.error(error)           
            setTimeout(() => {
                navigate('/');
                setShowLoginModal(true);                            
            }, 3000);
          } 
          else {
            setError('Доступ запрещен. У вас недостаточно прав для просмотра расчетов.');
            toast.error(error)
            // setTimeout(() => navigate('/'), 3000);
          }
        } 
        else {
          setError('Произошла ошибка при загрузке данных');
          toast.error(error)
        }
      }
    };
    fetchCalculations();
  }, [navigate]);

    // const navigate = useNavigate();

    // Обработчик создания нового расчета
    // const handleCreate = () => {
    //     navigate('/calculations/new');
    // }

  const formattedDate = (fDate) => {
    return new Date(fDate).toLocaleString(
      'ru-RU', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC'
      }
    ).replace(',',' ')        
  }
  
  const termsSearch = searchTerm.toUpperCase().split(' ');
  const filteredCalculations = calculations.filter(calculation => {
    //const terms = searchTerm.toUpperCase().split(' ');
        // Создаем строку для поиска из нужных полей        
    const searchString = [
      calculation.ComponentName,
      calculation.UpLimitConcSubstance.toString(),
      calculation.CountDensities.toString(),
      formattedDate(calculation.DateTime),
      calculation.Username
      ].join(' ').toUpperCase();
      return termsSearch.every(term => searchString.includes(term));
    });

  return (
    <div className="container pt-3 mt-5 p-3 bg-white">
      <h2 className='text-center text-primary fw-bold'>
        <span><i class="bi bi-list-columns me-2"></i></span>
        Список расчётов калибровачных графиков
      </h2>
      <div className="mb-1 input-group shadow shadow-lg shadow-sm">
        <input
          className="form-control"
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

            <div className="row p-1 m-0 alert alert-primary">
                {/* <div className="col-6 col-md-6 col-lg-8">
                    <h2 className="text-primary">
                        Список расчётов калибровачных графиков
                        <strong className="h3"></strong>
                    </h2>
                </div> */}
                <div className="col col-lg-12 col-md-6 col-sm-4">
                    <Link to="/calculations/new" className="btn btn-primary btn-lg m-1 w-100 animate-up-2 animate-bounce">
                    <i class="bi bi-plus-circle me-1"></i>
                      <i class="bi bi-graph-up me-2"></i>
                      Создать новый расчёт
                    </Link>                    
                </div>                
            </div>

            <div className="mt-1 p-0 table-responsive">
                <table className="table table-striped table-bordered table-hover, table-responsive" >
                    <thead className='thead-dark'>
                        <tr>
                            <th>ID</th>
                            <th>Компонент</th>
                            <th>Дата</th>
                            <th>Концентрация</th>
                            <th>Кол плотностей</th>
                            <th>Изменения</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCalculations.map(calculation => (
                            <tr 
                                key={calculation.id}
                                // onClick={() => window.location.href = `/site/calculations/${calculation.id}`}
                                onClick={() => navigate(`/calculations/${calculation.id}`)}
                                
                                //className='cursor-pointer transition'
                                style={{
                                    cursor: 'pointer', // Меняем курсор на указатель при наведении
                                    transition: 'background-color 0.2s' // Плавное изменение цвета при наведении
                                }}
                                className="tr-hover-effect" // Дополнительный класс для hover-эффектов
                            >
                                <td>
                                    <Link 
                                        to={`/calculations/${calculation.id}`}
                                        className="text-decoration-none" // Убираем подчеркивание у ссылки
                                        onClick={(e) => e.stopPropagation()}                                        
                                    >
                                        {calculation.id}
                                    </Link>
                                </td>
                                <td>{calculation.ComponentName}</td>
                                <td>
                                    {new Date(calculation.DateTime).toLocaleString(
                                        'ru-RU', {
                                            day: 'numeric',
                                            month: 'numeric',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            timeZone: 'UTC'
                                        }
                                    ).replace(',',' ')}
                                    {/* {calculation.DateTime} */}
                                </td>
                                <td>{calculation.UpLimitConcSubstance}</td>
                                <td>{calculation.CountDensities}</td>
                                <td>{calculation.Username}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
    </div>
  );
};

export default CalculationList;