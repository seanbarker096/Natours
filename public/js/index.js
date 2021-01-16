//index.js used to get data from user interface and then delegate actions
import '@babel/polyfill';
import { displayMap } from './mapbox';
import { login, logout } from './login';
import { updateData } from './updateData';
import { bookTour } from './stripe';

const mapBox = document.getElementById('map');
const loginForm = document.querySelector('.form--login');
const logOutBtn = document.querySelector('.nav__el--logout');
const updateDataForm = document.querySelector('.form-user-data');
const passwordForm = document.querySelector('.form-user-password');
const bookBtn = document.querySelector('#book-tour');

if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations);
  displayMap(locations);
}

if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    const email = document.querySelector('#email').value;
    const password = document.querySelector('#password').value;
    e.preventDefault();
    login(email, password);
  });
}

if (updateDataForm) {
  updateDataForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = new FormData();
    form.append('name', document.querySelector('#name').value);
    form.append('email', document.querySelector('#email').value);
    form.append('photo', document.querySelector('#photo').files[0]);
    updateData(form, 'data');
  });
}

if (passwordForm) {
  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.querySelector('.btn--save-password').innerHTML = 'Updating...';
    const passwordCurrent = document.querySelector('#password-current').value;
    const password = document.querySelector('#password').value;
    const passwordConfirm = document.querySelector('#password-confirm').value;
    await updateData(
      { passwordCurrent, password, passwordConfirm },
      'password'
    );

    document.querySelector('.btn--save-password').innerHTML = 'Save password';
    document.querySelector('#password-current').value = '';
    document.querySelector('#password-confirm').value = '';
    document.querySelector('#password').value = '';
  });
}

if (logOutBtn) {
  logOutBtn.addEventListener('click', logout);
}

if (bookBtn) {
  bookBtn.addEventListener('click', (e) => {
    e.target.innerHTML = 'Processing';
    const { tourId } = e.target.dataset;
    bookTour(tourId);
  });
}
