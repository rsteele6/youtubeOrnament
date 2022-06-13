require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
const path = require('path');
const cors = require('cors');
const childProcess = require('child_process');

// Load template engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Firefox child process
let firefoxOpen;

const apiBaseURL = "https://www.googleapis.com/youtube/v3";
const videoBaseURL = "https://www.youtube.com/watch?v=";
const PORT = 3000;

// Hardcoded commercial vids
const preset70s = `${videoBaseURL}o3QzP0WQY1s`;
const preset80s = `${videoBaseURL}oqn5WQhXb9Y`;
const preset90s = `${videoBaseURL}S4xZiWohrOg`;

// CORS
app.use(cors());

// Middleware that allows you to access properties of req.body
app.use(express.urlencoded({extended: true})); 

// built-in middleware for json 
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, "/public")));

// Routes

//Index page

app.get('/', (req, res) =>
{
    res.render('index', 
    {
        title: 'YouTube Holiday Ornament Control Panel'
    });
});

//Commercials Route
app.get("/commercials/:decade", async (req, res) => 
{
    try 
    {
        let redirectTarget;

        if (firefoxOpen) 
        {
            firefoxOpen.kill();
        }

        switch(req.params.decade.toLowerCase())
        {
            case '70s':
                redirectTarget = preset70s;
                break;
            case '80s':
                redirectTarget = preset80s;
                break;
            case '90s':
                redirectTarget = preset90s;
                break;
            default:
                res.send("Invalid decade.");
        }
    
        if (redirectTarget) 
        {
            firefoxOpen = childProcess.exec(`firefox ${redirectTarget} --kiosk`);
        }
    } 
    catch (err) 
    {
        res.send(err);    
    }
});

// Free choice
app.post('/results', async (req, res) => 
{
    try 
    {
        const submitPressed = req.body.submitButton;
        const maxResults = 5;
    
        if (submitPressed)
        {
            const searchQuery = req.body.search;
            const url = `${apiBaseURL}/search?key=${process.env.API_KEY}&maxResults=${maxResults}&type=video&part=snippet&q=${searchQuery}`;
            const response = await axios.get(url);
            const titles = response.data.items.map(item => item.snippet.title);
            const videoIDs = response.data.items.map(item => item.id.videoId);
    
            let headings = [];
            let videos = [];
    
            titles.forEach((title, index) => 
            {
                headings.push(title);
            });

            videoIDs.forEach((video, index) =>
            {
                const videoID = videoIDs[index];
                videos.push(`/results/${videoID}`);
            });
            
            res.render('results', 
            {
                title: 'YouTube Holiday Ornament Control Panel | Results',
                headings: headings,
                videos: videos
            });
        }
    } 
    catch (err) 
    {
        res.send(err);
    }
});

// Routes user to selected video on Youtube
app.get("/results/:videoId", async (req, res) =>
{    
    try 
    {
        if (firefoxOpen) 
        {
            firefoxOpen.kill();
        }
    
        if (req.params.videoId) 
        {
            firefoxOpen = childProcess.exec(`firefox ${videoBaseURL}${req.params.videoId} --kiosk`);
        }
    
        else 
        {
            res.send("Missing video ID.");
        }
    } 
    catch (err) 
    {
        res.send(err);
    } 
});

// Settings page
app.get('/settings', (req, res) =>
{
    res.render('settings', 
    {
        title: 'YouTube Holiday Ornament Control Panel | Settings'
    });
});

// Reboot device
app.get('/reboot', async (req, res) =>
{
    try 
    {
        childProcess.exec('sudo /sbin/shutdown -r now');

        res.redirect(200, '/');
    } 
    catch (err) 
    {
        res.send(err);
    }
});

// Shut down device
app.get('/shutdown', (req, res) =>
{
    try 
    {
        childProcess.exec('sudo /sbin/shutdown now');

        res.redirect(200, '/');
    } 
    catch (err) 
    {
        res.send(err);
    }
});

// Page not found
app.all('*', (req, res) => 
{
    res.status(404);

    if (req.accepts('html')) 
    {
        res.render('404', 
        {
            title: 'YouTube Holiday Ornament Control Panel | 404 - Page not found'
        });
    } 
    else if (req.accepts('json')) 
    {
        res.json({ "error": "404 Not Found" });
    } 
    else 
    {
        res.type('txt').send("404 Not Found");
    }
});

// Start Server
app.listen(PORT, () => console.log(`*** Server running on port ${PORT} ***`));