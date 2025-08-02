// components/AsutpContactsPage.jsx
import React, { useState } from 'react';
import InfoPageLoader from './InfoPageLoader';
import InfoModal from './InfoModal';

const AsutpContacts = () => {
  const [selectedContactText, setSelectedContactText] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Функция для форматирования текста контакта
  const formatContactText = (contact) => {
    let text = `${contact.position}\n`;
    if (contact.full_name) {
      text += `${contact.full_name}\n`;
    }
    
    contact.details.forEach(detail => {
      text += `${detail.type}\n`;
      detail.value.forEach(val => {
        text += `${val}\n`;
      });
    });
    
    return text.trim();
  };

  // Обработчик клика по контакту
  const handleContactClick = (contact) => {
    const contactText = formatContactText(contact);
    setSelectedContactText(contactText);
    setShowModal(true);
  };

  // Компонент для отображения одного контакта
  const ContactCard = ({ contact }) => (
    <div 
      className="card h-100 shadow-sm"
      onClick={() => handleContactClick(contact)}
      style={{ cursor: 'pointer' }}
    >
      <div className="card-body">
        <h5 className="card-title text-primary">{contact.position}</h5>
        {contact.full_name && (
          <h6 className="card-subtitle mb-2 text-muted">{contact.full_name}</h6>
        )}
        
        {contact.details.map((detail, index) => (
          <div key={index} className="mt-2">
            <small className="fw-bold text-muted">{detail.type}:</small>
            <div className="mt-1">
              {detail.value.map((val, valIndex) => (
                <span 
                  key={valIndex} 
                  className="badge bg-secondary me-1 mb-1"
                >
                  {val}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Функция, которая будет вызвана когда данные загрузятся
  const handleDataLoaded = ({ asutpData }) => {
    if (!asutpData.contacts || asutpData.contacts.length === 0) {
      return (
        <div className="container mt-5 mb-5 py-5">
          <div className="alert alert-info text-center" role="alert">
            Нет контактных данных для отображения
          </div>
        </div>
      );
    }

    return (
      <div className="container mt-5 mb-5 py-4">
        <div className="row">
          <div className="col-12">
            <h2 className="text-center mb-4">Контакты {asutpData.department}</h2>
          </div>
        </div>

        <div className="row g-3">
          {asutpData.contacts.map((contact, index) => (
            <div key={index} className="col-lg-6 col-xl-4">
              <ContactCard contact={contact} />
            </div>
          ))}
        </div>

        <InfoModal 
          show={showModal}
          onHide={() => setShowModal(false)}
          contactText={selectedContactText}
        />
      </div>
    );
  };

  return (
    <InfoPageLoader onLoaded={handleDataLoaded} />
  );
};

export default AsutpContacts;