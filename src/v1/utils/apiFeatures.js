class APIFeatures {
  constructor(query, queryStr) {
      this.query = query;
      this.queryStr = queryStr;
  }

  search() {
    const sellerId = this.queryStr.sellerId 
      ? {
        sellerId:this.queryStr.sellerId
      }
      : {}

    const categoryId = this.queryStr.categoryId
      ? {
        category: categoryId
      }
      : {}

    const name = this.queryStr.name
      ? {
        name: {$regex: this.queryStr.name, $options: "i"}
      }
      : {}
    const summary = this.queryStr.summary
      ? {
        summary: {$regex: this.queryStr.summary, $options: "i"}
      }
      : {}
    const searchNormal = {
        $or: [
            {...name},
            {...summary}
        ]
    }

    this.query = this.query.find({...sellerId, ...searchNormal, ...categoryId });
    return this;
  }

  filter() {
      const queryCopy = { ...this.queryStr };

      // Removing fields from the query
      const removeFields = ["limit", "curentPage", "sellerId", "categoryId", "name", "summary"];
      removeFields.forEach((el) => delete queryCopy[el]);

      // Advance filter for price, ratings etc
      let queryStr = JSON.stringify(queryCopy);
      queryStr = queryStr.replace(
          /\b(gt|gte|lt|lte)\b/g,
          (match) => `$${match}`
      );

      this.query = this.query.find(JSON.parse(queryStr));
      return this;
  }

  pagination(resPerPage = 10) {
      const currentPage = Number(this.queryStr.currentPage) || 1;
      const skip = resPerPage * (currentPage - 1);

      this.query = this.query.limit(resPerPage).skip(skip);
      return this;
  }
}

module.exports = APIFeatures;
