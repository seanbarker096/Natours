const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Email = require('../utils/email');

const signToken = (id) =>
  //use _id as payload for jwt
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const cookieOptions = {
  expires: new Date(
    Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
  ),
  //send cookie only via https if in production
  secure: process.env.NODE_ENV === 'production',
  //use httpOnly cookie
  httpOnly: true,
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.cookie('jwt', token, cookieOptions);

  //dont send encrypted password to client
  user.password = undefined;

  //send token back to user (i.e. sign them in)
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: user,
    },
  });
};

exports.signup = catchAsync(async (req, res) => {
  //destructure body. If used req.body client could add 'admin' property
  //which would then be added to database
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }
  //check if user in db and add password field

  const user = await User.findOne({ email }).select('+password');
  //compare password to one in database
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect username or password', 401));
  }
  //give user a JWT token
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

//requires user to be logged in
exports.protect = catchAsync(async (req, res, next) => {
  //get token
  let token;
  if (
    //verify via authorization header
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    //or verify by jwt token on cookie
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not signed in. Please sign in to get access', 401)
    );
  }
  //verify token is correct by decoding to access properties. These are then used
  //to compare to user document
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //check if user still exists (id is _id as this is what we created token with)
  const freshUser = await User.findById(decoded.id);
  if (!freshUser) {
    return new AppError(
      'The user belonging to the token no longer exists',
      401
    );
  }
  //check if user has changed password after token issued
  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again', 401)
    );
  }
  //set user to req.user for use in other parts of the api
  req.user = freshUser;
  //Set local variable which will be accessible in our pug templates
  res.locals.user = freshUser;
  //grant access to protected route
  next();
});

exports.isLoggedIn = async (req, res, next) => {
  //use local try catch to catch error locally if no logged in user,
  //and then just call next without calling a catchAsync error like in other controllers
  try {
    if (req.cookies.jwt) {
      //verify token is correct by decoding to access properties. These are then used
      //to compare to user document
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      //check if user still exists (id is _id as this is what we created token with)
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }
      //check if user has changed password after token issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }
      //if reaches here there is a logged in user
      //Set local variable which will be accessible in our pug templates
      res.locals.user = currentUser;
      //grant access to protected route
      return next();
    }
    next();
  } catch (err) {
    next();
  }
  //if no cookie, skip
};

exports.restrictTo = (...roles) =>
  //use wrapper funciton to allow custom args
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new Error('There is no user with this email address', 404));
  }
  //generate random reset token and add as property to user obj
  const resetToken = user.createPasswordResetToken();
  //save this back to database after new props added, and disable custom validators for post to db
  await user.save({ validateBeforeSave: false });

  //use nodemailer util to send email to user
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}}`;
    await new Email(user, resetURL).sendPasswordReset();
  } catch (err) {
    //clear token so cant be used
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email. Try again!'),
      500
    );
  }

  res.status(200).json({
    status: 'success',
    message: 'Token sent to email!',
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //get user based on the reset token given to them in url
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //if token hasnt expired set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  //update changedPasswordAt property
  //log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //get user from database
  const user = await User.findById(req.user.id).select('+password');
  //check if posted password is correct
  const correctPassword = await user.correctPassword(
    req.body.passwordCurrent,
    user.password
  );
  //if correct, update password
  if (!correctPassword) {
    return next(new Error('Your inputted passsword is incorrect', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  //create new token so if a hacker is logged into their old password, they can
  //no longer use it
  //log user in, send JWT
  createSendToken(user, 200, res);
});
