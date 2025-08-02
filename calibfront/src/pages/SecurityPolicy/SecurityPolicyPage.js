// Получение данных с хук и страница
import React from 'react';
import SavePolicyToFile from '../../components/Export/SavePolicyToFile';
import { useSecurityPolicy } from '../../hooks/useSecurityPolicy';
import { splitIntoSentences } from '../../utils/methods';

const SecurityPolicyPage = () => {
  const { policy, loading, error } = useSecurityPolicy();

  // // Функция разбивает текст на предложения по точке
  // const splitIntoSentences = (text) => {
  //   return text.split('.').filter(Boolean); // Удаляем пустые строки
  // };

  const renderSection = (section) => {
    console.log("section ", section)
    return (
      <div key={section.id} className="mb-4">
        <h2>{section.id}. {section.title}</h2>
        {section.subsections ? (
          section.subsections.map((sub) => (
            <div key={sub.id} className="ml-4 mb-2">
              &nbsp;&nbsp;&nbsp;<strong>{sub.id}. {sub.title}</strong>
              <ul className='ps-5'>
                {splitIntoSentences(sub.content).map((sentence, index) => (
                  <li key={index} style={{ paddingLeft: '0rem', listStyleType: 'disc' }}>{sentence.trim()}</li>
                ))}
              </ul>
              {/* <p>{sub.content}</p> */}
            </div>
          ))
        ) : (
          <ul className='ps-5'>
            {splitIntoSentences(section.content).map((sentence, index) => (
              <li key={index} style={{ paddingLeft: '0rem', listStyleType: 'disc' }}>{sentence.trim()}</li>
            ))}
          </ul>    
        //   <p>{section.content}</p>
        )}
      </div>
    );
  };
  
  if (loading) return <div className='container mb-5 pt-5 mb-5'><p className='mb-5 pt-5 mb-5'>Загрузка политики безопасности...</p></div>
  if (error) return <div className='container mb-5 pt-5 mb-5'><p className='mb-5 pt-5 mb-5' style={{ color: 'red' }}>{error}</p></div>;  

  return (
    <div className="container mt-5 pt-2 mb-5 text-start">
      <h1>{policy.title}</h1>
      <h3>Приложение: {policy.application_name}</h3>
      <hr />
      {policy?.sections?.map(renderSection)}
      <hr />
      <SavePolicyToFile policy={policy} />
    </div>
  );
};

export default SecurityPolicyPage;