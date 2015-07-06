import scraper from './scraper';

scraper
  .getAll(address)
  .then(data => {
    console.log(data);

  })


// tocsv.json2csv(data, function(err, csv) {
//   if (err) throw err;
//   console.log(csv);
// }, {
//   DELIMITER: {
//     FIELD: '#'
//   }
// });
