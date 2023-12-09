require('dotenv').config();
const express = require('express');
const {MongoClient} = require('mongodb');
const cors = require('cors');
const shortID = require('shortid');
const dns = require('dns');
const urlParse = require('url');
const app = express();

const client = new MongoClient(process.env.MONGO_URL);
const db = client.db('urlshortner');
const urls = db.collection('urls');

// Basic Configuration
const port = process.env.PORT || 3000;

//Apply middleware to get body of the request
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/public', express.static(`${process.cwd()}/public`));
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.post('/api/shorturl', async (req, res) => {
  const {url} = req.body;
  const shortURL = shortID.generate();
  const dnsLookup = dns.lookup(urlParse.parse(url).hostname, 
      async (err, address) => {
        try{if(!address){
          res.json({error: 'Invalid URL'});
        } else {
          let urlFind = await urls.findOne({originalURL: url})
          if(urlFind) {
            res.json({
              original_url: url,
              short_url: urlFind.shortURL
            });
          } else {
            const urlCollection = {
              originalURL: url,
              shortURL: shortURL
            },
            result = await urls.insertOne(urlCollection);
            console.log(result);
            res.json({original_url: url, short_url: shortURL});
          }
        } } catch(err){
          res.status(500).json('Server error..');
        }
      });
});

app.get('/api/shorturl/:short_url', async (req, res) => {
  try{
    const urlParams = await urls.findOne({shortURL: req.params.short_url});
    if(urlParams) return res.redirect(urlParams.originalURL);
    return res.status(404).json('No URL found');

  } catch(err){
    res.status(500).json('Server error..');
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
