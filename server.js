import express from 'express';
import orbweaver from './lib/orbweaver';

var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static('public'));
app.use(require('express-promise')());

app.get('/analyze', async function (req, res) {
  const url = req.query.url;
  if(!url) {
    throw new Error('Invalid url');
  }

  try {
    const csv = await orbweaver.getCsv(url);
    res.header("Content-Type", 'text/csv');
    res.send(csv);
  }
  catch(error) {
    console.error('Error!');
    console.error(error);
    res.status(500);
    res.render('error', { error });
  }

});

var server = app.listen(app.get('port'), function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('orbweaver listening at http://%s:%s', host, port);
});
