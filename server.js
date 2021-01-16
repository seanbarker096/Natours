//store custom environment variables to nodes process object
const mongoose = require('mongoose');
const dotenv = require('dotenv');

//handle exceptions (i.e. coding errors)
process.on('uncaughtException', (err) => {
  console.log(
    '\n\nUNCAUGHT EXCEPTION. Error message:\n\n',
    err.message,
    '\n\n Full error:\n\n',
    err
  );
  console.log('Now shutting down...');
  process.exit(1);
});

//give application access to custom environment variables
dotenv.config({ path: './config.env' });

const app = require('./app');

//create mongoDB connection string
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => console.log('DB connection successful'));
//.catch((err) => console.log(err));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

//deal with unhandled promise rejections using node process obj
process.on('unhandledRejection', (err) => {
  console.log(
    '\n\nUNHANDLED REJECTION. Error message:\n\n',
    err.message,
    '\n\n'
  );
  console.log('Now shutting down...');
  server.close(() => {
    //need to crash application when there is uncaught expection as
    //app in unclean state
    process.exit(1);
  });
});
