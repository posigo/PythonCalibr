import React, { useEffect, useState } from "react";
import { getUncertainty } from "../../services/api";

const UncertaintyModal = ({
  show,  
  onHide, 
  idUncertainty,
  uncertainty,
  setUncertainty
}) => {

  const [value, setValue] = useState(-9999.0);
  const [valueSubstance, setValueSubstance] = useState(0.0);
  const [numberMeasure, setNumberMeasure] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
    
  useEffect(() => {
    setValueSubstance(uncertainty['valueSubstance']);
    setNumberMeasure(uncertainty['numberMeasure']);
    setValue(uncertainty['value']);
  }, [uncertainty])

  useEffect(() => {
    // console.log("valueSubstance->", valueSubstance);
    // console.log("numberMeassure->", numberMeasure);
    // console.log("value->", value);
    setUncertainty({
      value,
      valueSubstance,
      numberMeasure
    });
  }, [valueSubstance, numberMeasure, value])

  const handleOffUncertainty = () => {
    // Сброс к начальным значениям
    setValueSubstance(0.0);
    setNumberMeasure(0);
    setValue(-9999.0);    
  }

  const handleCalcUncertainty = async () => {
    if (isCalculating) return;
    setIsCalculating(true);
    try {
      console.log("response_uncertainty->", idUncertainty);
      console.log("response_uncertainty->", valueSubstance);
      console.log("response_uncertainty->", numberMeasure);
      const response = await getUncertainty(idUncertainty, valueSubstance, numberMeasure);
      console.log("response_uncertainty->", response.data.uncertaintyLinearCalibration);
      const resultValue = response.data.uncertaintyLinearCalibration;
      setValue(resultValue);
      // Обновляем состояние в родительском компоненте
      setUncertainty({
        value: resultValue,
        valueSubstance,
        numberMeasure
      });
    }
    catch (error) {
      console.error("Ошибка при вычислении неопределенности:", error);
    }
    finally {
      setIsCalculating(false);
    }
  }

  const handleInputChangeMeassure = (e) => {
    const value = parseInt(e.target.value) || 0;
    setNumberMeasure(value);
  }

  const handleInputChangeSubstance = (e) => {
    const value = parseFloat(e.target.value) || 0.0;
    setValueSubstance(value);
  }

  if (!show) return null;

  return (
    <div 
      className="modal modal-backdrop fade show d-block animate__animated animate__faster animate__fadeIn" 
      style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
      tabIndex='-1'
      onKeyDown={(e) => e.key === 'Escape' && onHide()}
      onClick={(e) => e.target === e.currentTarget && onHide()}
    >
      <div className='modal-dialog modal-dialog-centered modal-dialog-scrollable animate__animated animate__faster animate__zoomIn'>
        <div className='modal-content border border-3 border-warning shadow-lg'>
          <div className='modal-header bg-warning text-black'>
            <h5 className='modal-title fw-bold'>              
              <i className="bi bi-calculator  me-1"></i>
              <i class="bi bi-infinity  me-2"></i>
              Расчёт неопределёности линейной градуировки
            </h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onHide}
              aria-label="Close"
              // onClick={() => setShowEditModal(false)}
            ></button>
          </div>
          <div 
            // className="modal-body overflow-auto" style={{ maxHeight: '70vh' }}
            className="modal-body overflow-auto h-75"
          >
            <div className="mb-3">
              <label className='form-label text-start d-block w-100'>Концентрация вещества</label>
              <div className='input-group'>
                <span className='input-group-text text-primary'>
                  <i class="bi bi-box"></i>
                </span>
                <input
                  type="number"
                  className="form-control"
                  name="username"
                  value={valueSubstance}
                  onChange={handleInputChangeSubstance}
                  step="0.1"
                  min="0.0"
                />
              </div>              
            </div>
            <div className="mb-3">
              <label className='form-label text-start d-block w-100'>Количество измерений</label>
              <div className='input-group'>
                <span className='input-group-text text-primary'><i className='bi bi-123 me-2'></i></span>
                <input
                  type="number"
                  className="form-control"
                  // name="password"
                  value={numberMeasure}
                  onChange={handleInputChangeMeassure}                  
                  min="0"
                  step="1"
                />
              </div>
            </div>
            <div className="mb-3">
              <label className='form-label text-start d-block w-100'>Неопределённость</label>
              <div className='input-group'>
                <span className='input-group-text text-primary'><i class="bi bi-infinity me-2"></i></span>
                <input
                  type="number"
                  className="form-control"
                  // name="first_name"
                  value={value}
                  readOnly
                //   onChange={handleInputChange}
                />
              </div>              
            </div>
          </div>
          <div className='modal-footer border-top-0 col-auto'>
            <button 
              type='button' 
              className='btn btn-outline-secondary fw-bold me-3 animate__animated animate__fadeInLeft' 
              onClick={onHide}
              style={{ minWidth: '120px' }}
            >
              <i className="bi bi-x-circle me-2"></i>
              закрыть
            </button>            
            <button 
              type='button' 
              className='btn btn-warning fw-bold px-4 animate__animated animate__fadeInLeft' 
              onClick={handleOffUncertainty }
              disabled={isCalculating || valueSubstance <= 0 || numberMeasure <= 0}
            >
              <i class="bi bi-bootstrap-reboot"></i>
              Сброс
            </button>
            <button 
              type='button' 
              className={`btn btn-primary fw-bold px-4 animate__animated ${!isCalculating && valueSubstance > 0 && numberMeasure > 0 ? 'animate__pulse animate__infinite' : ''}`}
              onClick={handleCalcUncertainty}
              disabled={isCalculating || valueSubstance <= 0 || numberMeasure <= 0}
            >
              {isCalculating ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Вычисление...
                </>
              ) : (
                <>
                  <i className="bi bi-calculator me-2"></i>
                  Вычислить
                </>
              )}             
            </button>     
          </div>
        </div>    
      </div>
    </div>    
  )
}

export default UncertaintyModal;