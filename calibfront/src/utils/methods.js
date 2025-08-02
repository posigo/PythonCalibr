// Функция разбивает текст на предложения по точке
export const splitIntoSentences = (text) => {
  return text.split('.').filter(Boolean); // Удаляем пустые строки
};