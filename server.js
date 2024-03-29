// server.js

//---------------------------------------
//---------------------------------------
// Main dependencies
//---------------------------------------
//---------------------------------------
const express = require('express');
const rp = require('request-promise');
//https://www.npmjs.com/package/request-promise
const app = express();
const http = require('http');
const server = http.createServer(app);
const port = process.env.PORT || 8088;
const fetch = require('node-fetch');

//---------------------------------------
// set the view engine to ejs
//---------------------------------------
app.set('view engine', 'ejs');
//https://scotch.io/tutorials/use-ejs-to-template-your-node-application

//---------------------------------------
// compare and sort API responses
//---------------------------------------
function sortStrings(a, b) {
  // Assuming you want case-insensitive comparison
  a = a.toLowerCase();
  b = b.toLowerCase();
  return (a < b) ? -1 : (a > b) ? 1 : 0;
};
// https://stackoverflow.com/questions/19259233/sorting-json-by-specific-element-alphabetically

function sortNumber(a, b) {
  return a - b;
};
//https://stackoverflow.com/questions/1063007/how-to-sort-an-array-of-integers-correctly




//---------------------------------------
// create route for index page
//---------------------------------------
app.get('/', function (req, res) {
  let tagline = "Learn more about the Star Wars universe";
  res.render('pages/index', {
    tagline: tagline
  });
});

//---------------------------------------
// create route for characters page 
//---------------------------------------

//https://stackoverflow.com/questions/49129245/javascript-using-fetch-and-pagination-recursive
function getStarWarsPeople(progress, url = 'https://swapi.co/api/people', people = []) {
  console.log("test")
  return new Promise((resolve, reject) => fetch(url)
    .then(response => {
      console.log('url', url)
      if (response.status !== 200) {
        throw `${response.status}: ${response.statusText}`;
      }
      response.json().then(data => {
        people = people.concat(data.results);

        if (data.next) {
          progress && progress(people);
          getStarWarsPeople(progress, data.next, people).then(resolve).catch(reject)
        } else {
          resolve(people);
        }
      }).catch(reject);
    }).catch(reject));
};

function progressCallback(people) {
  // render progress
  console.log(`${people.length} loaded`);
};

// getStarWarsPeople(progressCallback)
//   .then(people => {
//     // all people have been loaded
//     console.log(people.map(p => p.name));
//   })
//   .catch(console.error);



app.get('/characters', async (req, res) => {
  console.log("test2")
  //https://stackoverflow.com/questions/6912584/how-to-get-get-query-string-variables-in-express-js-on-node-js
  await getStarWarsPeople(progressCallback)
    .then((data) => {
      const parsedQuery = req.query.sort;
      if (parsedQuery === 'name') {
        data.sort(function (a, b) {
          return sortStrings(a.name, b.name);
        })
      }
      if (parsedQuery === 'mass') {
        data.sort(function (a, b) {
          return sortNumber(a.mass, b.mass);
        })
      }
      if (parsedQuery === 'height') {
        data.sort(function (a, b) {
          return sortNumber(a.height, b.height);
        })
      }console.log("data", data[0])
      res.render('pages/characters', {
        data: data
      });
      sortByName = false;
    })
    .catch((err) => {
      // Deal with the error
      console.log(err);
    })
});

//------------------------------------------------
// create route for specific character by NAME
//------------------------------------------------
app.get('/character/:name', (req, res) => {
  rp({
    uri: `https://swapi.co/api/people/?search=${req.params.name}`,
    json: true
  })
    .then((data) => {
      res.render('pages/character', {
        data: data.results
      });
    })
    .catch((err) => {
      // Deal with the error
      console.log(err);
    })
});

//-------------------------------
// Extract name from residents
//-------------------------------

function extractNames(param) {
  return Promise.all(
    param.map(residentUri => {
      return rp({
        uri: residentUri,
        json: true
      })
    })
  ).then(residents => {
    const residentNames = residents.map(resident => {
      return resident.name
    })
    return residentNames;
  }).catch(err => {
    console.log(err);
  })
};

function setResidentNames(planets) {
  const result = {};
  return Promise.all(
    planets.map(planet => {
      return extractNames(planet.residents)
        .then(residentNames => {
          planet.residents = residentNames
        })
    })
  )
    .then(() => {
      return planets;
    })
};

//-------------------------------------------------------
// create route for planetresidents page - raw json
//-------------------------------------------------------

//https://stackoverflow.com/questions/49129245/javascript-using-fetch-and-pagination-recursive
function getStarWarsPlanets(progress, url = 'https://swapi.co/api/planets', planets = []) {
  return new Promise((resolve, reject) => fetch(url)
    .then(response => {
      console.log('url', url)
      if (response.status !== 200) {
        throw `${response.status}: ${response.statusText}`;
      }
      response.json().then(data => {
        setResidentNames(data.results).then(updatedPlanets => {
          planets = planets.concat(updatedPlanets);

          if (data.next) {
            progress && progress(planets);
            getStarWarsPlanets(progress, data.next, planets).then(resolve).catch(reject)
          } else {
            resolve(planets);
          }
        });
      }).catch(reject);
    }).catch(reject));
};

function progressCallback(planets) {
  // render progress
  console.log(`${planets.length} loaded`);
};

// getStarWarsPlanets(progressCallback)
//   .then(planets => {
//     // all people have been loaded
//     console.log(planets);
//   })
  // .catch(console.error);

// app.get('/planetresidents', (req, res, next) => {
//   getStarWarsPlanets(progressCallback)
//     .then((data) => {
//       console.log('data', data[1])
//       let planets = data.results;
//       getPlanets(planets)
//         .then(p => {
//           res.render('pages/planetresidents', {
//             data: JSON.stringify(p)
//           });
//         })
//         .then((data) => {
//           res.render('pages/planetresidents', {
//             data: planets
//           });
//         })
//     })
//     .catch((err) => {
//       console.log(err);
//     })
// });

app.get('/planetresidents', (req, res, next) => {
  getStarWarsPlanets(progressCallback)
    .then((data) => {
      res.render('pages/planetresidents', {
        data: data
      })
      console.log('planetdata', data[1])
    })
    .catch((err) => {
      console.log(err);
    })
});

app.get('/pr', (req, res, next) => {
  getStarWarsPlanets(progressCallback)
    .then((data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data, null, 3));
    })
    .catch((err) => {
      console.log(err);
    })
});

//---------------------------------------
// set up port listener
//---------------------------------------
server.listen(port, '0.0.0.0', function () {
  server.close(function () {
    server.listen(port, '0.0.0.0')
  })
})
console.log('8088 is the magic port');


