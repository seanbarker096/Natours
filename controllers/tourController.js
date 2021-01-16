//All tour route handlers
const multer = require('multer');
const sharp = require('sharp');
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError(`Not and image. Please upload only images.`, 400), false);
  }
};
//generate multer upload and specify folder to save images to
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});
//use multer to upload multiple images
exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);
//
exports.resizeTourImages = catchAsync(async (req, res, next) => {
  // console.log(req.files);

  if (!req.files.imageCover || !req.files.images) {
    next();
  }

  //process cover image
  //add filename to req.body so can be used in updateOne and then our app can
  //get the picture using this name
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      //add images away to req.body so databsae updates on updateOne
      req.body.images.push(filename);

      return await sharp(req.files.images[i].buffer)
        //.resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);
    })
  );

  next();
});

exports.aliasTopTours = (req, res, next) => {
  //add properties to the users query to display top 5 tours correctly
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = factory.getAll(Tour);
//populate review subdocs to tour
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);
exports.createTour = factory.createOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  //aggregate pipeline with match, group and sort operations
  const stats = await Tour.aggregate([
    {
      //only select if rating more than 4.5
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      //group by difficulty field and then compute the subsequent calcs and store
      //in the specified variable names
      $group: {
        //single group
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    {
      //where there are multiple startDates in given document, create new seperate document for each startDate
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      //group docs based on calculating month from startDate field
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        //create new array in each group item with all tours included in group
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      //specifying 0 means do not include the _id field (which we set to month)
      //in next stage. We have added a new field for month above so not required
      $project: {
        _id: 0,
      },
    },
    {
      $sort: { numTourStarts: -1 },
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;
  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude om the format lat,lng.',
        400
      )
    );
  }

  const tours = await Tour.find({
    startLocation: {
      $geoWithin: {
        $centerSphere: [[lng, lat], radius],
      },
    },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude om the format lat,lng.',
        400
      )
    );
  }
  const distances = await Tour.aggregate([
    {
      //if only have 1 geospatial index on schema it will use this field. If
      //have multiple then need to give key
      $geoNear: {
        near: {
          //specify as geoJson
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        //field where distances will be stored
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    //only return distance and name
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    results: distances.length,
    data: {
      data: distances,
    },
  });
});
