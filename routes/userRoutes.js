const express = require('express');

const router = express.Router();

const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

//apply protect middleware to all routes defined after this point
router.use(authController.protect);

router.patch('/updateMyPassword', authController.updatePassword);

//getMe simply uses req.user set after sign in onto the request body
router.get('/me', userController.getMe, userController.getUser);
router.delete('/deleteMe', userController.deleteMe);
//uupload middleware takes file and saves to dest we specified
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);

router.use(authController.restrictTo('admin'));
// prettier-ignore
router
  .route('/')
  .get(userController.getAllUsers)
// prettier-ignore
router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
