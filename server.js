import express from 'express';
import finnalyze from './lib/finnalyze';
import winston from 'winston';

  winston.level = 'debug';

var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static('public'));
app.use(require('express-promise')());

app.get('/analyze', function (req, res) {
  const url = req.query.url;
  if(!url) {
    throw new Error('Invalid url');
  }

  finnalyze
    .getCsv(url)
    .then(csv => {
      res.header("Content-Type", 'text/csv');
      res.send(csv);
    }, err => {
      res.status(500);
      res.render('error', { error: err });
    });

});

app.get('/progress', function(req, res) {
  return finnalyze.progress;
})

var server = app.listen(app.get('port'), function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('finnalyze listening at http://%s:%s', host, port);
});
