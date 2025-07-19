import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css'; // Создайте этот файл для стилей футера
import { constTexts } from '../../utils/constTexts';

const Footer = () => {
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
                <h6><Link to="#" onClick={() => showAlert(messages.about)}>сектор АСУТП УАМИТ</Link></h6>
                <Link to="#" onClick={() => showAlert(messages.contacts)}>Контакты (31-63)</Link>                    
              </div>
              <div className="footer-section">                   
                <h6><Link to="#" onClick={() => showAlert(messages.faq)}>Помощь</Link></h6>
              </div>
              <div className="footer-section">
                <h6><Link to="#" onClick={() => showAlert(messages.privacy)}>Политика конфиденциальности</Link></h6>
                <h6><span className='text-danger'>!!! </span>Использование социальный сетей запрещено</h6>                    
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
        </div>        
    );
};

export default Footer;