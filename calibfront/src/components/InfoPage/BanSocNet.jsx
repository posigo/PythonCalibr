// components/AsutpContactsPage.jsx
import React, { useEffect, useState } from 'react';
import InfoPageLoader from './InfoPageLoader';
import InfoModal from './InfoModal';

const BanSocNet = () => {
  const [selectedContactText, setSelectedContactText] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect (() => {
    const fetchData = () => {
      setSelectedContactText('Использование социальный сетей на территории завода запрещено на основании ЛПА №ХХХ, ОЗИ №ХХХ');
      setShowModal(true);
    };
    fetchData();
  }, []);

//   setSelectedContactText('Использование социальный сетей на территории завода запрещено на основании ЛПА №ХХХ, ОЗИ №ХХХ');
//   setShowModal(true);

  return (
    <>
      <InfoModal 
      show={showModal}
      onHide={() => setShowModal(false)}
      contactText={selectedContactText}        
    />
   
    </>
  );
};

export default BanSocNet;