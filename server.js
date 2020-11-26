require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const movies = require('./movies-data-small');

const handleAuth = (req, res, next) => {
    // verifies auth token
    const apiToken = process.env.API_TOKEN;
    const authToken = req.get('Authorization');

    if (!authToken || authToken.split(' ')[1] !== apiToken) {
        return res.status(401)
            .json({ error: 'Unauthorized Request' });
    }

    next();
}

const app = express();
app.use(morgan('dev'));
app.use(helmet());
app.use(cors());
app.use(handleAuth);

const searchByTerm = (store, searchType, searchTerm) => {
    // handles search type and uses term to return filtered array
    searchTerm = searchTerm.toLowerCase();

    const filtered = store
        .filter(mov => {
            const type = mov[searchType].toLowerCase();
            return type.includes(searchTerm);
        });

    return filtered;
}

const searchByVote = (store, avgVote) => {
    // handles search # and uses number to return filtered array
    const filtered = store
        .filter(mov => mov.avg_vote >= avgVote);

    return filtered;
}

const curateResponse = (req, res) => {
    // start with the whole dang store
    let response = movies;

    // deconstruct queries
    const { genre, country, avg_vote } = req.query;

    // do not accept lack of query 
    if (!genre && !country && !avg_vote) {
        res.status(400).json({ error: 'Please provide at least one query!' });
        
    } else {
        //does genre query exist? if so, run a search, otherwise do nothing
        genre ?
            response = searchByTerm(response, 'genre', genre)
            : response;

        //does country query exist? if so, run a search, otherwise do nothing
        country ?
            response = searchByTerm(response, 'country', country)
            : response;

        //does avg vote query exist? if so, attempt to run a search, otherwise do nothing
        const vote = parseInt(avg_vote);
        avg_vote ?
            // only run a search if number is valid - throw error otherwise
            !Number.isNaN(vote) ?
                response = searchByVote(response, vote)
                : 
                res.status(400).json({ error: 'Average vote must be a number!' })
            : response;

        //if nothing matches a search, send a message instead of empty array
        response.length === 0 ?
            response = 'Sorry! No results found, please try again.'
            : response;

        res.status(200).json(response);
    }
}

app.get('/movie', curateResponse);

app.listen(8000, () => {
    console.log('Express server is listening on port 8000!');
});