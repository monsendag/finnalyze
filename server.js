import express from 'express';

var app = express();

app.use(express.static('public'));

app.get('/analyze', function (req, res) {
  const url = req.query.url;
  if(!url) {
    throw new Error('Invalid url');
  }
  res.send(`analyzing ${req.query.url}`);
});

var server = app.listen(3000, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

});
