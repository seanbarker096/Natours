//Class which takes client query and does some processing depending on options client gave
//in the query
//Works by chaining on new methods to the instantiated query object which has been passed into it
class APIFeatures {
  constructor(query, queryString) {
    //query is the instantiated mongoose query obj
    this.query = query;
    //this is the query object on req.query
    this.queryString = queryString;
  }

  filter() {
    //filtering
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);
    //advanced filtering
    //convert query obj to string so can use .replace
    let queryStr = JSON.stringify(queryObj);
    //add mongo operator ($)
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    //add this find method to the query object instance

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      //reformat the query string
      const sortBy = this.queryString.sort.split(',').join(' ');
      //add mongooses sort to query object
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      //add select method to query object
      this.query = this.query.select(fields);
    } else {
      //exclude __v field
      this.query = this.query.select('-__v');
    }
    return this;
  }

  //skip pages according to client query
  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

module.exports = APIFeatures;
