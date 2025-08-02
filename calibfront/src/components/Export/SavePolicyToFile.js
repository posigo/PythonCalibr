import React from 'react';
import { splitIntoSentences } from '../../utils/methods'

// const splitIntoSentences = (text) => {
//   return text.split('.').filter(Boolean).map(s => s.trim());
// };

// Форматирует политику в читаемый текст
const formatPolicyToText = (policy) => {
  let result = [];

  // Заголовок
  result.push(`${policy.title}\n`);
  result.push(`Приложение: ${policy.application_name}\n\n`);

  // Секции
  policy.sections.forEach(section => {
    const sectionHeader = `${section.id}. ${section.title}`;
    result.push(sectionHeader);

    if (section.subsections) {
      section.subsections.forEach(sub => {
        const subHeader = `\t${sub.id}. ${sub.title}`;
        result.push(subHeader);

        const sentences = splitIntoSentences(sub.content);
        sentences.forEach(sentence => {
          result.push(`\t\t\u2022 ${sentence}`);
        });
      });
    } else {
      const sentences = splitIntoSentences(section.content);
      sentences.forEach(sentence => {
        result.push(`\t\u2022 ${sentence}`);
      });
    }

    result.push('\n');
  });

  return result.join('\n');
};



const SavePolicyToFile = ({ policy }) => {

  const handleDownload = () => {
    // Преобразуем JSON в текст
    // const textContent = JSON.stringify(policy, null, 2);
    const textContent = formatPolicyToText(policy);

    // Создаём Blob и ссылку на скачивание
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'CalibrPolicy.txt'; // Название файла
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    // Очистка
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      className="btn btn-secondary mt-2"
    >
      Сохранить политику в файл
    </button>
  );
};

export default SavePolicyToFile;