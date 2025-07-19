import React, { useEffect, useState, } from 'react';
import { getCalculation, deleteCalculation } from '../services/api';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Graph from './Graph';
import DeleteConfirmation from './DeleteConfirmation'
//npm install react-toastify
import { toast } from 'react-toastify'
//import SimpleGraph from './SimpleGraph'
import GraphComponent from './GraphComponent'
import UncertaintyModal from './Uncertainty/UncertaintyModal';
import ExportToExcel from './Export/ExportToExcel';
import { useAuth } from '../context/AuthContext'; 

const CalculationDetail = () => {
  
  const { usrData } = useAuth()

  const { id } = useParams();
  const [calculation, setCalculation] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showUncertainty, setShowUncertainty] = useState(false);
  const [uncertainty, setUncertainty] = useState({
    'value': -9999.0,
    'valueSubstance': 0.0,
    'numberMeasure': 0
  });

  const [isGroupUser, setIsGroupUser] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const navigate = useNavigate()

  useEffect(() => {
    const fetchCalculation = async () => {
      console.log("usrData-CalcDetail->", usrData)
      const response = await getCalculation(id);
      setCalculation(response.data);
      setIsGroupUser(usrData?.groups?.includes('users'));
      if (response.data.ChangeOwner && 
        usrData?.groups?.includes('extusers') &&
        usrData?.userid !== response.data.IdCreate) {
        setIsOwner(true)
      }
      //setIsDeleting(usrData?.groups?.includes('users'));
    };
    fetchCalculation();
  }, [id, usrData]);

  if (!calculation) return <div>Loading...</div>;
    
  // Есть ли растворы у расчёта?
  const hasSolutions = (calc) =>  {
    if (calc?.calculation_solutions.lenght > 0) {
      return true;
    };
    return false;
  }
  console.log(calculation)
  
  // Функция удаления расчета    
  const handleDeleteCalculation = async () => {
    setIsDeleting(true);
    try {
      const response = await deleteCalculation(calculation.id);
      if (response.status !== 204) {
        throw new Error('Ошибка при удалении');
      }      
      toast.success('Расчёт и связанные данные успешно удалены');
      navigate('/calculations/');      
    }
    catch (error) {
      console.log('c1')
      console.error('Ошибка:', error);
      console.log('c2')
      alert('Не удалось удалить расчет');
      console.log('c3')
    }
    finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

    // Обработчик редактирования
    // const handleEdit = () => {
    //     navigate(`/calculation/${id}/edit`);
    // }

  const handleClickLinkNo = (e) => {
    if (isGroupUser || isOwner) {
      e.preventDefault(); // Отменяем переход
      if (!isGroupUser) {
        toast.error('🚫 Доступ запрещён: Только автор расчёта имеет права для редактирования');
      } else {
        toast.error('🚫 Доступ запрещён: у вас недостаточно прав для редактирования');
      }
    }    
  }

  return (
    <div className="container-fluid mt-5 pt-3">
      <div className="row mb-5 d-flex" style={{ display1: 'flex', height1: '100vh' }}>
        <div className="col col-1"></div>
        <div className="col col-10" style={{ overflowY1: 'auto', maxHeight1: '100vh' }}>
          <div className="container">
            <div className="h2 text-center text-uppercase text-primary">
              <i class="bi bi-graph-up me-2"></i>
              Детали расчёта
            </div>
            <div className="row text-start" align="left">
              <div className="col col-auto border border-2 border-info rounded m-3">
                <strong>Компонент: </strong>{calculation.ComponentName}<br />
                <strong>Предел вверхней концентрации: </strong> {calculation.UpLimitConcSubstance}<br />
                <strong>Дата расчёта: </strong>
                {new Date(calculation.DateTime).toLocaleString(
                  'ru-RU', {
                    day: 'numeric',
                    month: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'UTC'
                  }
                )}<br />
                <strong>Количество плотностей в растворе: </strong>{calculation.CountDensities}<br />
                <details>
                  <summary>Детали компонента</summary>
                  <strong>Id: </strong><small id="calcId">{calculation.id}</small><br />
                  <strong>Прибор: </strong>{calculation.Device}<br />
                  <strong>Метод: </strong>{calculation.SolutionBasic}<br />
                  <strong>Базовый раствор: </strong>{calculation.BasicSolution}<br />
                  <strong>Рабочий раствор: </strong>{calculation.SolutionWorking}<br />
                  <strong>Длина волны: </strong>{calculation.Walvelength}<br />
                  <strong>Кювета: </strong>{calculation.UpLimitConcSubstance}<br />
                </details>
              </div>
            </div>
          </div>

          {hasSolutions ? (
            <>
              <div className='container table-responsive'>
                <table className="table table-bordered border-2 border-info table-sm caption-top table-hover align-middle text-center p-3">
                  <caption>Таблица растворов</caption>
                  <thead>
                    <tr className='alert-info border-info border-2 text-black p-3'>
                      <th className="p-3" valign="middle">Значение</th>
                      {/* Динамически создаем заголовки для Optical Densities */}
                      {Array.from({length: calculation.CountDensities }, (_, index) => (
                        <th className="p-3" valign="middle" key={index}>ОптПлотн{index+1}</th>
                      ))}
                      <th className="p-3" valign="middle">Абсалютная погрешность</th>
                      <th className="p-3" valign="middle">Относительная погрешность</th>
                      <th className="p-3" valign="middle">Complete Measurement Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculation.calculation_solutions.map(solution => (
                      <React.Fragment key={solution.id}>
                        <tr className="border border-info border-2" key={solution.id}>
                          <td className="p-3" rowSpan="2">{solution.Value}</td>
                          {/*<td>{solution.solution_optical_densities.map(od => od.Value).join(', ')}</td>*/}
                          {/* Динамически создаем заголовки для Optical Densities */}
                          {solution.solution_optical_densities.map((od, odIndex) => (
                            <td key={odIndex}>{od.Value.toFixed(3)}</td>
                          ))}
                          { calculation.sample_size_solution-1 > 0 ? (
                            <>
                              <td>{solution.error_absolute_optical_density.toFixed(6)}</td>
                              <td>{solution.error_relative_optical_density.toFixed(6)}</td>
                              <td>{solution.complete_measurement_result}</td>
                            </>
                          ) : (
                            <><td colSpan="3" className="text-danger">недостаточно решений для определения!!!</td></>
                          )}
                        </tr>
                        <tr className="border border-info border-2">
                          <td colSpan={calculation.CountDensities+3}>
                            <details className="text-start">
                              <summary>Детали раствора</summary>
                              <strong>заданное количество плотностей-{'>'}</strong>
                              { solution.CountDensities !== calculation.CountDensities ? (
                                <><span className='text-danger fw-bold'>{solution.CountDensities}</span></>
                              ) : (
                                <><span className=''>{solution.CountDensities}</span></>
                              )}
                              <br />
                              <strong>реальное количество плотностей-{'>'}</strong>
                              { solution.count_optical_density !== solution.CountDensities ? (
                                                        <>
                                                        <span className='text-danger fw-bold'>{solution.count_optical_density}</span>
                                                        </>
                              ) : (
                                                        <>
                                                        <span className=''>{solution.count_optical_density}</span>
                                                        </>
                              )}
                              <br />
                              <strong>среднее значение плотностей-{'>'}</strong>{solution.average_optical_density.toFixed(6)}<br />
                              <strong><small>стандартное математическое отклонение плотностей</small>-{'>'}</strong>{solution.std_dev_optical_density.toFixed(6)}<br />
                              <strong>обратное распределение стьюдента-{'>'}</strong>
                              {calculation.sample_size_solution-1>0 ? (
                                                        <>
                                                        {solution.inverse_t_distribution.toFixed(6)}
                                                        </>
                              ) : (
                                                        <>
                                                        <span className="text-danger fw-bold">недостаточное количество растворов для вычисления</span>
                                                        </>
                              )}
                              <br />
                              <strong><small>скорректирование значение среднего значения плотностей</small>-{'>'}</strong>
                              {calculation.list_avr_corrected_od_solution
                                .find(item => item.id === solution.id)
                                ["avr_corrected_od_solution"].toFixed(6)
                              }
                            </details>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="container">
                { calculation.Y_Value === -9999 ? (
                  <>
                    <div className="text-start text-danger alert alert-danger fw-bold">
                      {calculation.Y_String}
                      <small> (Проверьте набор условий измерения!!!)</small>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-start text-primary alert alert-info fw-bold">
                      {calculation.Y_String}
                    </div>
                  </>
                )}
                <div className="row justify-content-between text-start">
                  <div className='col-auto'>
                    <div className='row'>
                      <div className="col col-auto border border-2 border-info ms-2 rounded">
                        <details>
                          <summary>Детали результат расчёта</summary>
                          <strong>размер выборки-{'>'}</strong>{calculation.sample_size_solution}<br />
                          <strong>cумма значений растворов-{'>'}</strong>{calculation.sum_values_solution.toFixed(1)}<br />
                          <strong>среднее значение растворов-{'>'}</strong>{calculation.average_solutions.toFixed(6)}<br />
                          <strong>сумма квадратов значений растворов-{'>'}</strong>{calculation.sum_square_values_solution.toFixed(6)}<br />
                          <strong><small>сумма средних значений оптических плотностей</small>-{'>'}</strong>{calculation.sum_avr_od_values_solution.toFixed(6)}<br />
                          <strong><small>сумма произведений значений растворов и средних значений плотностей</small>-{'>'}</strong>{calculation.sum_mul_values_and_avr_od_solution.toFixed(6)}<br />
                          <strong>a-{'>'}</strong>{calculation.a.toFixed(6)}<br />
                          <strong>b-{'>'}</strong>{calculation.b.toFixed(6)}<br />
                          <strong>Sy-{'>'}</strong>{calculation.Sy.toFixed(6)}<br />
                          <strong>Sa-{'>'}</strong>{calculation.Sa.toFixed(6)}<br />
                          <strong>распределение стьюдента-{'>'}</strong>
                          { calculation.sample_size_solution-2>0 ? (
                            <>
                              <span>{calculation.t_distribution.toFixed(6)}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-danger">
                                не хватает растворов для вычисления
                              </span>
                            </>
                          )}
                          <br />
                          <strong>значение расчёта Y-{'>'}</strong>{calculation.Y_Value.toFixed(6)}<br />
                          <details>
                            <summary>координаты графика</summary>
                            <strong>x0-{'>'}</strong><span id="x0">{calculation.graphXY[0]["x"].toFixed(6)}; </span>
                            <strong>y0-{'>'}</strong><span id="y0">{calculation.graphXY[0]["y"].toFixed(6)}</span>
                            <br />
                            <strong>x1-{'>'}</strong><span id="x1">{calculation.graphXY[1]["x"].toFixed(6)}; </span>
                            <strong>y1-{'>'}</strong><span id="y1">{calculation.graphXY[1]["y"].toFixed(6)}</span>
                            </details>
                        </details>                                                  
                      </div>               
                    </div>   
                  </div>
                  <div className='col-auto'>
                    {uncertainty.value !== -9999.0 && (    
                      <div className='row'>
                        <div className='col col-auto border border-2 border-info rounded'>
                          <details>
                            <summary>Неопределённость линейной градуировки</summary>
                            <strong>при значении вещества-{'>'}</strong>{uncertainty.valueSubstance.toFixed(1)}<br />
                            <strong>при количестве измерений-{'>'}</strong>{uncertainty.numberMeasure}<br />
                            <strong>неопределённость равна-{'>'}</strong>{uncertainty.value.toFixed(1)}<br />
                          </details>                        
                          </div>
                      </div>
                    )}                  
                  </div>
                </div>
                <div className='container mt-2'>
                  <div className='row'>
                    <div className='col col-6 mx-auto'>
                      <h4>График калибровки</h4>
                      <div className='bg-white p-1 rounded shadow w-100' style={{'min-width': '400px', 'min-height': '250px'}}>
                        <GraphComponent graphXY={calculation.graphXY}/>
                      </div>
                    </div>
                  </div>                                        
                </div>                
              </div>

              <UncertaintyModal
                show={showUncertainty}
                onHide={() => setShowUncertainty(false)}
                idUncertainty={calculation.id}
                uncertainty={uncertainty}
                setUncertainty={setUncertainty}
              />

            </>
          ) : (
                        <>
                        <div className="row pt-4 m-0 alert alert-danger" role="alert">
                            <p className="text-danger h1">В расчёте нет растворов!!!</p>
                        </div>
                        </>
          )}

                    {/* <h3>Graph</h3>
                    <Graph data={calculation.graphXY} />                     */}
        </div>
        <div className="col col-1 sticky-top align-self-start d-flex flex-column gap-2">                
          <Link to="/calculations" className="btn btn-secondary w-100 py-2">
            <i class="bi bi-list-columns me-2"></i>
            Назад к списку
          </Link>
          <Link 
            to={`/calculations/${calculation.id}/edit`} 
            // className='btn btn-primary text-break w-100 py-2 disabled'
            className={`btn btn-primary text-break w-100 py-2 ${usrData?.groups?.includes('users') ? 'disabled1' : ''}`}
            // style={{
            //   pointerEvents: usrData?.groups?.includes('users') ? 'none' : 'auto',
            //   opacity: usrData?.groups?.includes('users') ? 0.5 : 1
            // }}
            onClick={handleClickLinkNo}
          >
            <i class="bi bi-file-text me-2"></i>
            Редактировать
          </Link>
          <Link 
            to={!isOwner && !isGroupUser ? `/calculations/${id}/solutions/${calculation.CountDensities}` : `#`} 
            className="btn btn-info text-break w-100 py-2"
            onClick={handleClickLinkNo}
          >
            <i class="bi bi-droplet-half me-2"></i>
            Растворы
          </Link>
          <ExportToExcel 
            calculation={calculation} 
            uncertainty={uncertainty} 
          />
          <button 
            className="btn btn-danger w-100 py-2"
            onClick={(e) => {
              if (isGroupUser || isOwner) {
                handleClickLinkNo(e)
              }
              else {
                setShowDeleteModal(true)
              }
            }}
            disabled={isDeleting}
          >
            <i class="bi bi-trash"></i>
            Удалить расчёт
          </button>          
          <button
            className='btn btn-secondary text-wrap text-break'
            onClick={() => setShowUncertainty(true)}
          >
            <i class="bi bi-infinity"></i>
            неопределённость линейной градуировки
          </button>          
          {/* Модальное окно подтверждения */}
          <DeleteConfirmation 
            show={showDeleteModal}
            calculation={calculation}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleDeleteCalculation}
           />
        </div>                
      </div>
    </div>
  );
};

export default CalculationDetail;