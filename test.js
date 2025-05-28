db.products.aggregate([
  {
    $match: {
      price: {$gt: 1200}
    }
  },
  {
    $group: {
      _id: "$company",
      totalProducts: {$sum: "$price"},
    }
  }
])


db.products.aggregate([
  {
    $match: {
      company: '64c23350e32f4a51b19b923e'
    }
  }
])

db.sales.aggregate([
  { $match: {"quantity" : 5} }, 
  {
    $group : {
      _id: "$quantity",
      AvgPrice: {$avg: "$price"},
      priceTotal: {$sum: "$price"}
    }
  }
])

db.products.aggregate([
  {
    $match: {
      price: {$gt: 1200}
    }
  },
  {
    $group: {
      _id: "$company",
      totalProducts: {$sum: "$price"},
    }
  },
  {
    $sort: {totalProducts: 1}
  }
])


db.products.aggregate([
  {
    $project: {
      price: 1,
      discountPrice: {$multiply: ["$price", 0.8]}
    }
  }
])

db.products.aggregate([
  {$unwind: "$colors"},
  {$match: {price: {$gt: 900}}},
  {
    $group: {
      _id: "$price",
      allColors: {$addToSet: "$colors"},
    }
  },
  {$project: {
    _id: 1,
    allColors: 1,
    colorsLength: {$size: "$allColors"}
  }}
])