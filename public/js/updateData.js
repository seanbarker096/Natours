/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

//type is either password or data
export const updateData = async (data, type) => {
  try {
    const url =
      type === 'password'
        ? '/api/v1/users/updateMyPassword'
        : '/api/v1/users/updateMe';

    const response = await axios({
      method: 'PATCH',
      url,
      data,
    });

    if (response.data.status === 'success') {
      showAlert('success', `${type} was updated succesfully`);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
