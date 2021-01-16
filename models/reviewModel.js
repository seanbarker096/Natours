const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    tour: {
      //create reference to other model
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },

    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must have an author'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//each user can only create 1 review per tour
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

//for all find review ops, populate user documents with name and photo properties
reviewSchema.pre(/^find/, function (next) {
  //dont populate tour here in order to avoid chained populates
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  //if theres are reviews to do above calcs on then add new fields, otherwise create default
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

//once new item saved, do calculation
reviewSchema.post('save', function () {
  //'this' points to current review

  //as Review not defined yet, add a property to the constructor function for the Review Model,
  //so the property is added when its eventually created
  this.constructor.calcAverageRatings(this.tour);
});

//workaround so we can run calcAverageRatings from model object whenever we run update queries on reviews
reviewSchema.pre(/^findOneAnd/, async function (next) {
  //this.findOne gets the document we have set up to find in the query obejct
  this.review = await this.findOne();
  //we add doc to query object (accessible via 'this' inside query middlware)
  //so it is accessible in the post middleware too
});

//create post middleware too as need to calc new stats on new database once
//review update has been applied
reviewSchema.post(/^findOneAnd/, async function () {
  //now call calcAvereageRatintgs, which is defined on the instance of the model(document) stored inside this.review
  //on the model we set to 'this' in
  //the pre middleware, with tourId as argument
  await this.review.constructor.calcAverageRatings(this.r.tour);
});

const Review = new mongoose.model('Review', reviewSchema);

module.exports = Review;
