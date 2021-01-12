# ATE
## Research Emissions Model for Auckland Transport

This repo contains the code used to scrape data from the Auckland Transport API, and join this data with other data to create a single model of a sample of the bus operations on the Auckland Transport network between Dec 2020-Jan 2021.

## Setup

Nodejs is used as the runtime environment for the program so this must be installed.

Nodejs is available for download [here](https://nodejs.org/en/download/).

Installation and Running:
    1.  In a console, navigate to `YourInstallationDirectory/ATE`
    2.  Enter `npm install`
        This will install all the necessary packages for our program
    3.  In the console, while still located in `/ATE` folder, type `node views/app.js`
    4.  Navigate to `localhost:3000` to interact with the server now running on your machine.

## API

Endpoints:

  Endpoint | Function | Arguments | Response
--- | --- | --- | ---
`/distinct` | Ensure all existing entries in db are unique. Get all the distinct UUIDs from the realtime_raw dataset and compare this with all the entries | - |  none, prints to console
`/completed_trips` | Test for trips without stop info and save to db collection | - | none, prints to console
`/compare_UUIDs` | Get all the UUIDs for a day then send these to the schedule for comparison, do the same for the schedule. This tells us roughly how many trips are missing from the realtime and the schedule | - | none, prints to console
`/compare_scheduled_to_observed` | Get a day by day comparison of the trips in the schedule as the base table, and whether or not their UUIDs are present in the realtime. Take all the UUIDs from the schedule and compare | - | none, prints to console
`/compare_observed_to_schedule` | Get the raw info for each day, then compare to schedule to see if the UUID of each journey is present in the schedule | - | none, prints to console.
`generate_schedule` |   Auto generate valid trips from realtime_raw, append route information; used to filter to provider. Auto generate schedule from trips, routes, calendar and calendarDates. Creates collection until todays date | - | either generated data or response message
`get_raw_data` | Get the raw realtime data provided by the AT API, optionally between a range of dates, and download data for each day. | Query Params: 
    <ol><li>download=true: download local copy</li>
    <li>dates=: a date or range of dates for the data to fall between (inclusive)</li>
        <ul><li>..* dates in form [{1} DD/MM/YYYY{1} [, DD/MM/YYYY]? ]{1} (<--regex)<li></ul></ol> | JSON format data between dates provided, or 2020/12/23-2021/01/23

## UI