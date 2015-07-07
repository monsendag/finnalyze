import express from 'express';

var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static('public'));

app.get('/analyze', function (req, res) {
  const url = req.query.url;
  if(!url) {
    throw new Error('Invalid url');
  }
  res.send(`analyzing ${req.query.url}`);
});

var server = app.listen(app.get('port'), function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

});
