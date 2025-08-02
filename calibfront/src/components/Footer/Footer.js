import React, {useState} from 'react';
import { Link } from 'react-router-dom';
import './Footer.css'; // Создайте этот файл для стилей футера
import { constTexts } from '../../utils/constTexts';
import DownloadHelpPDF from '../Export/DownloadHelpPDF';
import { useNavigate } from 'react-router-dom';
import InfoModal from '../InfoPage/InfoModal';

const Footer = () => {
  const [showModal, setShowModal] = useState(false);
  const [modalText, setModalText] = useState('');

  const handleSocNetClick = () => {
    const message = 'Использование социальных сетей на территории завода запрещено на основании ЛПА №ХХХ, ОЗИ №ХХХ';
    setModalText(message);
    setShowModal(true);
  };
  const navigate = useNavigate();

    const showAlert = (message) => {
        window.alert(message);
    };

    const messages = {
        about: 'Информация о секторе АСУТП УАМИТ',
        contacts: 'Контакты: внутренний телефон 31-63',
        faq: 'Раздел помощи в разработке',
        privacy: 'Политика конфиденциальности компании'
    };

    return (
      <div className='fixed-bottom align-self-stretch d-flex flex-row'>
        <footer className="footer">
          <div className="footer-content">
              <div className="footer-section">        
                <h6>
                  <Link 
                    to="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/asutpinfo');
                    }}
                  >
                    сектор АСУТП УАМИТ
                  </Link>
                </h6>
                <Link 
                  to="#" 
                  onClick={(e) => {
                      e.preventDefault();
                      navigate('/asutpcontact');
                    }}
                >
                  Контакты (31-63)
                </Link>                    
              </div>
              <div className="footer-section">                   
                <h6>
                  {/* <Link 
                    to="#" 
                    onClick={async () => {
                                    try {
                                        const response = await getHelpCalibrationPDF();
                                        const blob = new Blob([response.data], { type: 'application/pdf' });
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = 'CalcCalibrHelp.pdf';
                                        a.style.display = 'none';
                                        document.body.appendChild(a);
                                        a.click();
                                        a.remove();
                                        window.URL.revokeObjectURL(url);
                                    } catch (error) {
                                        console.error("Ошибка скачивания файла:", error);
                                        showAlert("Не удалось скачать файл помощи");
                                    }
                                }}
                  >
                    Помощь
                  </Link> */}
                  <DownloadHelpPDF />
                </h6>
              </div>
              <div className="footer-section">
                <h6>
                  <Link 
                    to='#'
                    // to="/securitypolicy" 
                    // to={`/securitypolicy?version=${new Date().getTime()}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/securitypolicy');
                    }}
                  >
                    Политика безопасности и конфиденциальности
                  </Link>
                </h6>
                <h6>
                  <Link
                    className='text-white' 
                    to='#'
                    onClick={(e) => {
                      e.preventDefault();
                      handleSocNetClick();
                    }}
                  >
                    <span className='text-danger'>!!! </span>Использование социальный сетей запрещено
                  </Link>  
                </h6>                    
              </div>
            </div>
            <div className="footer-bottom">
              <p>
                &copy; {new Date().getFullYear()} {` `} 
                <Link 
                  className='blueUnderlineLink'
                  to='https://www.grodno-khim.by/'
                  target='_blank'
                  rel='noopener noreferrer'
                //   style={{
                //     color: 'inherit',
                //     textDecoration: 'underline',
                //     textDecorationColor: 'blue'
                //   }}
                >
                  {constTexts.userfooter.companytext}
                </Link>
                . Все права защищены.
              </p>
            </div>
          </footer>
          <InfoModal 
            show={showModal}
            onHide={() => setShowModal(false)}
            contactText={modalText}        
          />
        </div>        
    );
};

export default Footer;