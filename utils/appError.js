class AppError extends Error {
  constructor(message, statusCode) {
    //call parent constructor which sets the message property which our class
    //then inherits
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    //identifies if its a client error or not for use later in global error handler
    this.isOperational = true;
    //only keep frames below the constructor in error message
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
