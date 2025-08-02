import { softDeleteActionHistory, hardDeleteActionHistory } from "../../services/api"

const DeleteRecordHistory =  async (id, typeDelete) => {
  console.log("DeleteRecordHistory-type id->", typeof id);
  console.log("DeleteRecordHistory-id=l", id);
  console.log("DeleteRecordHistory-type typeDelete", typeof typeDelete);
  console.log("DeleteRecordHistory-typeDelete", typeDelete);
  
  const actualTypeDelete = typeDelete
  console.log("DeleteRecordHistory-actualTypeDelete->", actualTypeDelete);
  try {
    if (typeDelete === 'soft') {
      await softDeleteActionHistory(id);
      alert('Запись помечена на удаление');
      return true;
    }
    if (typeDelete === 'hard') {
      await hardDeleteActionHistory(id);
      alert('Запись удалена навсегда');
      return true;
    }
    return false;
  } catch (error) {
    alert('Ошибка при удалении: ' + error.message);
    return false;
  }
};


export default DeleteRecordHistory