class APIFeatures {
  constructor(query, queryStr) {
      this.query = query;
      this.queryStr = queryStr;
  }

  search() {
    const keyword = this.queryStr.keyword
        ?   {
            $text:{$search:this.queryStr.keyword},
            }
        : {};
             
    
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
        name: {$regex: this.queryStr.name, $option: "i"}
      }
      : {}
    const description = this.queryStr.summary
      ? {
        description: {$regex: this.queryStr.summary, $option: "i"}
      }
      : {}
    const searchNormal = {
        $or: [
            {...name},
            {...description}
        ]
    }

    this.query = this.query.find({ ...keyword, ...sellerId, ...searchNormal, ...categoryId });
    return this;
  }

  filter() {
      const queryCopy = { ...this.queryStr };

      // Removing fields from the query
      const removeFields = ["keyword", "limit", "curentPage", "sellerId", "categoryId", "name", "description"];
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

  pagination(resPerPage) {
      const currentPage = Number(this.queryStr.currentPage) || 1;
      const skip = resPerPage * (currentPage - 1);

      this.query = this.query.limit(resPerPage).skip(skip);
      return this;
  }
}

module.exports = APIFeatures;
