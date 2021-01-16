const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

//merge params so that params can be shared between routers
const router = express.Router({ mergeParams: true });

//cant get review info unless access via tours
router.use(authController.protect);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview
  );

router
  .route('/:id')
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  )
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .get(reviewController.getReview);

module.exports = router;
