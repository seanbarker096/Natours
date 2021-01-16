const mongoose = require('mongoose');
const slugify = require('slugify');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less or equal then 40 characters'],
      minlength: [10, 'A tour name must have more or equal then 10 characters'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        //validation message
        message: 'Difficulty is either: easy, medium, difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating but be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 4.5,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      //custom validation function
      validate: {
        validator: function (val) {
          //'this' only works in validator when creating new doc
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    //create sub doc which references another mongo model
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//create indexs for more efficient aggregation
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

//define getter function for durationWeeks property
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

//as we used parent referencing,create virtual property (not stored to database)
//which contains the review
tourSchema.virtual('reviews', {
  ref: 'Review',
  //specify field to use as lookup in child
  foreignField: 'tour',
  //and define what this field is stored under in the child model so can match them
  localField: '_id',
});

//DEFINE SCHEMA MIDDLWARES BEFORE COMPILING THE MODEL
//pre run before doc is created and saved to database
tourSchema.pre('save', function (next) {
  //created slugged version of name already defined in model
  this.slug = slugify(this.name, { lower: true });
  next();
});

// //runs after doc has been created
// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

//query middleware as we use the 'find' keyword.
//This is executed before the main query is executed
tourSchema.pre(/^find/, function (next) {
  //'this' is a query object
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  //populate guides field before returning tour to user
  this.populate({
    path: 'guides',
    select: 'name photo role',
  });
  next();
});
//runs after query executed
// tourSchema.post(/^find/, function (docs, next) {
//   next();
// });

//aggregation middleware
//run before aggregate
// tourSchema.pre('aggregate', function (next) {
//   //adds this match operation to start of aggregation pipeline array of operations
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
